use crate::models::{AppState, WsClientMsg, WsServerMsg};
use crate::services::ws_broadcast::broadcast;
use axum::extract::ws::{Message, WebSocket};
use axum::extract::{Path, State, WebSocketUpgrade};
use axum::response::IntoResponse;
use chrono::Utc;
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::time::{timeout, Duration};

/// WebSocket upgrade handler.
///
/// Route: `GET /session/:id/ws`
pub async fn ws_handler(
    State(state): State<Arc<AppState>>,
    Path(session_id): Path<String>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_ws_connection(state, session_id, socket))
}

async fn handle_ws_connection(state: Arc<AppState>, session_id: String, socket: WebSocket) {
    let (mut sender, mut receiver) = socket.split();
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<String>();

    // Verify session exists and send full state
    {
        let sessions = state.sessions.read().await;
        match sessions.get(&session_id) {
            Some(session_mutex) => {
                let session = session_mutex.lock().await;
                let msg = WsServerMsg::FullState {
                    session: session.clone(),
                };
                match serde_json::to_string(&msg) {
                    Ok(payload) => {
                        if sender.send(Message::Text(payload)).await.is_err() {
                            return;
                        }
                    }
                    Err(err) => {
                        eprintln!("Failed to serialize FullState: {}", err);
                        return;
                    }
                }
            }
            None => return,
        }
    }

    // Register this client
    {
        let mut clients = state.ws_clients.write().await;
        clients
            .entry(session_id.clone())
            .or_default()
            .push(tx.clone());
    }

    // Forward outgoing messages from the channel to the WebSocket and send periodic Ping frames.
    let mut send_task = tokio::spawn(async move {
        let mut ping_interval = tokio::time::interval(Duration::from_secs(30));
        loop {
            tokio::select! {
                biased;
                msg = rx.recv() => {
                    match msg {
                        Some(text) => {
                            if sender.send(Message::Text(text)).await.is_err() {
                                break;
                            }
                        }
                        None => break,
                    }
                }
                _ = ping_interval.tick() => {
                    if sender.send(Message::Ping(vec![])).await.is_err() {
                        break;
                    }
                }
            }
        }
    });

    // Process incoming messages with heartbeat
    let recv_state = state.clone();
    let recv_session_id = session_id.clone();
    let mut recv_task = tokio::spawn(async move {
        loop {
            match timeout(Duration::from_secs(30), receiver.next()).await {
                Ok(Some(Ok(Message::Text(text)))) => {
                    if let Ok(msg) = serde_json::from_str::<WsClientMsg>(&text) {
                        handle_ws_message(&recv_state, &recv_session_id, msg).await;
                    }
                }
                Ok(Some(Ok(Message::Close(_)))) | Ok(None) => break,
                Ok(Some(Ok(Message::Ping(data)))) => {
                    // Axum auto-responds to pings; ignore payload
                    let _ = data;
                }
                Ok(Some(Err(_))) => break,
                Err(_) => {
                    // Timeout waiting for client activity — no-op here.
                    continue;
                }
                _ => {}
            }
        }
    });

    // Wait for either task to finish
    tokio::select! {
        _ = &mut send_task => recv_task.abort(),
        _ = &mut recv_task => send_task.abort(),
    }

    // Remove client from registry
    {
        let mut clients = state.ws_clients.write().await;
        if let Some(senders) = clients.get_mut(&session_id) {
            senders.retain(|s| !s.same_channel(&tx));
            if senders.is_empty() {
                clients.remove(&session_id);
            }
        }
    }
}

async fn handle_ws_message(state: &AppState, session_id: &str, msg: WsClientMsg) {
    let sessions = state.sessions.read().await;
    let Some(session_mutex) = sessions.get(session_id) else {
        return;
    };
    let mut session = session_mutex.lock().await;

    match msg {
        WsClientMsg::BuzzIn { team_index, client_timestamp } => {
            if !session.buzz_lock {
                let is_home = session.current_page == "home";
                if let Some(team) = session.teams.get_mut(team_index) {
                    if !team.has_buzzed {
                        let server_time = Utc::now();
                        let team_name = team.team_name.clone();
                        
                        let _ = chrono::DateTime::parse_from_rfc3339(&client_timestamp);
                        
                        team.buzz_lock_owned = true;
                        team.last_buzz_attempt = Some(server_time);
                        if !is_home {
                            team.has_buzzed = true;
                        }
                        session.buzz_lock = true;
                        session.last_modified = Utc::now();
                        drop(session);
                        drop(sessions);
                        broadcast(state, session_id, &WsServerMsg::BuzzLocked { 
                            team_index,
                            server_timestamp: server_time,
                            client_timestamp,
                            team_name,
                        }).await;
                    }
                }
            }
        }
        WsClientMsg::ReleaseBuzz => {
            session.buzz_lock = false;
            for team in &mut session.teams {
                team.buzz_lock_owned = false;
                team.has_buzzed = false;
            }
            session.last_modified = Utc::now();
            drop(session);
            drop(sessions);
            broadcast(state, session_id, &WsServerMsg::BuzzReleased).await;
        }
        WsClientMsg::UpdateScore { team_index, score } => {
            if let Some(team) = session.teams.get_mut(team_index) {
                team.score = score;
                session.last_modified = Utc::now();
                drop(session);
                drop(sessions);
                broadcast(
                    state,
                    session_id,
                    &WsServerMsg::ScoreUpdate { team_index, score },
                )
                .await;
            }
        }
        WsClientMsg::UpdateTeamName { team_index, name } => {
            if let Some(team) = session.teams.get_mut(team_index) {
                team.team_name = name.clone();
                session.last_modified = Utc::now();
                drop(session);
                drop(sessions);
                broadcast(
                    state,
                    session_id,
                    &WsServerMsg::TeamNameUpdate {
                        team_index,
                        name,
                    },
                )
                .await;
             }
         }
         WsClientMsg::LockBuzzers => {
            session.buzz_lock = true;
            for team in &mut session.teams {
                team.buzz_lock_owned = false;
                team.has_buzzed = false;
            }
            session.last_modified = Utc::now();
            drop(session);
            drop(sessions);
            broadcast(state, session_id, &WsServerMsg::BuzzersLocked).await;
        }
         WsClientMsg::UpdateDarkMode { enabled } => {
             session.dark_mode = enabled;
             session.last_modified = Utc::now();
              drop(session);
              drop(sessions);
              broadcast(state, session_id, &WsServerMsg::DarkModeUpdate { enabled }).await;
          }
          WsClientMsg::UpdateTimerEnabled { enabled } => {
              session.timer_enabled = enabled;
              session.last_modified = Utc::now();
              drop(session);
              drop(sessions);
              broadcast(state, session_id, &WsServerMsg::TimerEnabledUpdate { enabled }).await;
          }
          WsClientMsg::AddTeam => {
              let new_team_index = session.teams.len();
              use crate::models::Team;
              let new_team = Team {
                   team_name: format!("Team {}", new_team_index + 1),
                   score: 0,
                   buzz_lock_owned: false,
                   has_buzzed: false,
                   last_buzz_attempt: None,
               };
              session.teams.push(new_team.clone());
              session.last_modified = Utc::now();
              drop(session);
              drop(sessions);
              broadcast(state, session_id, &WsServerMsg::TeamAdded { team: new_team }).await;
          }
          WsClientMsg::RemoveTeam { team_index } => {
              if team_index < session.teams.len() {
                  session.teams.remove(team_index);
                  session.last_modified = Utc::now();
                  drop(session);
                  drop(sessions);
                  broadcast(state, session_id, &WsServerMsg::TeamRemoved { team_index }).await;
              }
          }
          WsClientMsg::ResetHasBuzzed => {
              session.buzz_lock = false;
              for team in &mut session.teams {
                  team.buzz_lock_owned = false;
                  team.has_buzzed = false;
              }
              session.last_modified = Utc::now();
              drop(session);
              drop(sessions);
              broadcast(state, session_id, &WsServerMsg::HasBuzzedReset).await;
          }
          WsClientMsg::SetPage { page } => {
               session.current_page = page;
               session.last_modified = Utc::now();
               if session.current_page == "home" {
                   session.buzz_lock = false;
                   for team in &mut session.teams {
                       team.buzz_lock_owned = false;
                       team.has_buzzed = false;
                   }
                   drop(session);
                   drop(sessions);
                   broadcast(state, session_id, &WsServerMsg::HasBuzzedReset).await;
               } else {
                   let page = session.current_page.clone();
                   drop(session);
                   drop(sessions);
                   broadcast(state, session_id, &WsServerMsg::PageUpdate { page }).await;
               }
           }
           WsClientMsg::Ping { client_timestamp } => {
               let server_time = Utc::now();
               drop(session);
               drop(sessions);
               broadcast(state, session_id, &WsServerMsg::Pong {
                   server_timestamp: server_time,
                   client_timestamp,
               }).await;
           }
      }
}
