//! Route handlers for the Bible Challenge backend server.
//! This module defines HTTP endpoints and the WebSocket handler.

use crate::models::{AppState, Session, Team, WsClientMsg, WsServerMsg};
use axum::extract::ws::{Message, WebSocket};
use axum::extract::{Path, State, WebSocketUpgrade};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use chrono::Utc;
use futures_util::{SinkExt, StreamExt};
use rand::{distr::Alphabetic, Rng};
use std::sync::Arc;
use tokio::sync::Mutex as AsyncMutex;
use tokio::time::{timeout, Duration};

/// Broadcasts a server message to all WebSocket clients in a session.
/// Removes clients whose send channel has been closed.
async fn broadcast(state: &AppState, session_id: &str, msg: &WsServerMsg) {
    let payload = serde_json::to_string(msg).unwrap_or_default();
    let mut clients = state.ws_clients.write().await;
    if let Some(senders) = clients.get_mut(session_id) {
        senders.retain(|tx| tx.send(payload.clone()).is_ok());
    }
}

// ──────────────────────────────────────────────
// WebSocket handler
// ──────────────────────────────────────────────

/// WebSocket upgrade handler.
///
/// Route: `GET /session/:id/ws`
///
/// On connect, sends the full session state to the new client.
/// Listens for `WsClientMsg` from the client, applies mutations,
/// and broadcasts the resulting `WsServerMsg` to all clients in the session.
/// Includes a 30-second heartbeat: sends a Ping if no message is received.
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
                let payload = serde_json::to_string(&msg).unwrap();
                if sender.send(Message::Text(payload)).await.is_err() {
                    return;
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

    // Forward outgoing messages from the channel to the WebSocket
    let mut send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // Process incoming messages with heartbeat
    let recv_state = state.clone();
    let recv_session_id = session_id.clone();
    let recv_tx = tx.clone();
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
                    // Timeout — send ping to keep connection alive
                    if recv_tx.send(r#"{"type":"ping"}"#.to_string()).is_err() {
                        break;
                    }
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
        WsClientMsg::BuzzIn { team_index } => {
            if !session.buzz_lock {
                if let Some(team) = session.teams.get_mut(team_index) {
                    team.buzz_lock_owned = true;
                    session.buzz_lock = true;
                    session.last_modified = Utc::now();
                    drop(session);
                    drop(sessions);
                    broadcast(state, session_id, &WsServerMsg::BuzzLocked { team_index }).await;
                }
            }
        }
        WsClientMsg::ReleaseBuzz => {
            session.buzz_lock = false;
            for team in &mut session.teams {
                team.buzz_lock_owned = false;
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
    }
}

// ──────────────────────────────────────────────
// Shared state-update helpers (used by HTTP handlers)
// ──────────────────────────────────────────────

/// Applies a buzz lock for the given team, updates session state, and broadcasts via WS.
async fn apply_buzz_lock(
    state: &AppState,
    session_id: &str,
    team_index: usize,
) -> Option<()> {
    let sessions = state.sessions.read().await;
    let session_mutex = sessions.get(session_id)?;
    let mut session = session_mutex.lock().await;
    if session.buzz_lock {
        return None;
    }
    let team = session.teams.get_mut(team_index)?;
    team.buzz_lock_owned = true;
    session.buzz_lock = true;
    session.last_modified = Utc::now();
    drop(session);
    drop(sessions);
    broadcast(state, session_id, &WsServerMsg::BuzzLocked { team_index }).await;
    Some(())
}

/// Releases the buzz lock for the session and broadcasts via WS.
async fn apply_buzz_release(state: &AppState, session_id: &str) -> bool {
    let sessions = state.sessions.read().await;
    let Some(session_mutex) = sessions.get(session_id) else {
        return false;
    };
    let mut session = session_mutex.lock().await;
    session.buzz_lock = false;
    for team in &mut session.teams {
        team.buzz_lock_owned = false;
    }
    session.last_modified = Utc::now();
    drop(session);
    drop(sessions);
    broadcast(state, session_id, &WsServerMsg::BuzzReleased).await;
    true
}

// ──────────────────────────────────────────────
// HTTP route handlers
// ──────────────────────────────────────────────

/// `POST /session/start` — creates a new session and returns its ID.
pub async fn start_session(State(state): State<Arc<AppState>>) -> Json<String> {
    let session_id: String = rand::rng()
        .sample_iter(&Alphabetic)
        .take(4)
        .map(char::from)
        .collect();
    let mut session_id = session_id.to_uppercase();

    let now = Utc::now();
    let session = Session {
        created_at: now,
        last_modified: now,
        buzz_lock: false,
        teams: vec![
            Team {
                team_name: "Team 1".to_string(),
                score: 0,
                buzz_lock_owned: false,
            },
            Team {
                team_name: "Team 2".to_string(),
                score: 0,
                buzz_lock_owned: false,
            },
            Team {
                team_name: "Team 3".to_string(),
                score: 0,
                buzz_lock_owned: false,
            },
        ],
    };
    let mut sessions = state.sessions.write().await;
    while sessions.contains_key(&session_id) {
        session_id = rand::rng()
            .sample_iter(&Alphabetic)
            .take(4)
            .map(char::from)
            .collect();
        session_id = session_id.to_uppercase();
    }
    sessions.insert(session_id.clone(), AsyncMutex::new(session));
    Json(session_id)
}

/// `GET /session/:id` — checks if a session exists.
pub async fn get_session_id(
    State(state): State<Arc<AppState>>,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    let sessions = state.sessions.read().await;
    if sessions.contains_key(&session_id) {
        (StatusCode::OK, Json(Some(session_id)))
    } else {
        (StatusCode::NOT_FOUND, Json(None))
    }
}

/// `GET /session/:id/teams` — returns all teams for a session.
pub async fn get_session_team_info(
    State(state): State<Arc<AppState>>,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    let sessions = state.sessions.read().await;
    if let Some(session_mutex) = sessions.get(&session_id) {
        let session = session_mutex.lock().await;
        (StatusCode::OK, Json(Some(session.teams.clone())))
    } else {
        (StatusCode::NOT_FOUND, Json(None))
    }
}

/// `PUT /session/:id/teams/:index` — updates a team's full info and broadcasts via WS.
pub async fn modify_session_team_info(
    State(state): State<Arc<AppState>>,
    Path((session_id, team_index)): Path<(String, usize)>,
    Json(updated_team): Json<Team>,
) -> impl IntoResponse {
    let sessions = state.sessions.read().await;
    if let Some(session_mutex) = sessions.get(&session_id) {
        let mut session = session_mutex.lock().await;
        if let Some(team) = session.teams.get_mut(team_index) {
            let response_team = updated_team.clone();
            *team = updated_team;
            session.last_modified = Utc::now();
            drop(session);
            drop(sessions);
            broadcast(
                &state,
                &session_id,
                &WsServerMsg::FullState {
                    session: {
                        let sessions = state.sessions.read().await;
                        sessions
                            .get(&session_id)
                            .unwrap()
                            .lock()
                            .await
                            .clone()
                    },
                },
            )
            .await;
            (StatusCode::OK, Json(Some(response_team)))
        } else {
            (StatusCode::NOT_FOUND, Json(None))
        }
    } else {
        (StatusCode::NOT_FOUND, Json(None))
    }
}

/// `POST /session/:id/close` — closes session, notifies WS clients, and removes it.
pub async fn close_session(
    State(state): State<Arc<AppState>>,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    // Notify all connected WS clients before removal
    broadcast(&state, &session_id, &WsServerMsg::SessionClosed).await;

    // Remove WS clients
    state.ws_clients.write().await.remove(&session_id);

    // Remove session
    let removed = state.sessions.write().await.remove(&session_id).is_some();
    if removed {
        (StatusCode::OK, Json(true))
    } else {
        (StatusCode::NOT_FOUND, Json(false))
    }
}

/// `POST /session/:id/buzz/release` — releases the buzz lock via HTTP.
pub async fn release_buzz_lock(
    State(state): State<Arc<AppState>>,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    if apply_buzz_release(&state, &session_id).await {
        (StatusCode::OK, Json("Buzz lock released"))
    } else {
        (StatusCode::NOT_FOUND, Json("Session not found"))
    }
}

/// `POST /session/:id/buzz/:index` — acquires the buzz lock for a team via HTTP.
pub async fn set_buzz_lock_owned(
    State(state): State<Arc<AppState>>,
    Path((session_id, team_index)): Path<(String, usize)>,
) -> impl IntoResponse {
    match apply_buzz_lock(&state, &session_id, team_index).await {
        Some(_) => (StatusCode::OK, Json("Success")),
        None => {
            // Check if session exists vs buzz already locked
            let sessions = state.sessions.read().await;
            if let Some(session_mutex) = sessions.get(&session_id) {
                let session = session_mutex.lock().await;
                if session.buzz_lock {
                    (StatusCode::OK, Json("Fail"))
                } else {
                    (StatusCode::NOT_FOUND, Json("Team not found"))
                }
            } else {
                (StatusCode::NOT_FOUND, Json("Session not found"))
            }
        }
    }
}
