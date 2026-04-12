use crate::models::{AppState, WsServerMsg};
use chrono::Utc;
use crate::services::ws_broadcast::broadcast;

/// Applies a buzz lock for the given team, updates session state, and broadcasts via WS.
pub async fn apply_buzz_lock(
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
    let is_home = session.current_page == "home";
    let team = session.teams.get_mut(team_index)?;
    if team.has_buzzed {
        return None;
    }
    let server_time = Utc::now();
    let team_name = team.team_name.clone();
    team.buzz_lock_owned = true;
    team.last_buzz_attempt = Some(server_time);
    if !is_home {
        team.has_buzzed = true;
    }
    session.buzz_lock = true;
    session.last_modified = Utc::now();
    drop(session);
    drop(sessions);
    // For HTTP, use current time as client timestamp placeholder
    let client_timestamp = server_time.to_rfc3339();
    broadcast(state, session_id, &WsServerMsg::BuzzLocked { 
        team_index,
        server_timestamp: server_time,
        client_timestamp,
        team_name,
    }).await;
    Some(())
}

/// Releases the buzz lock for the session and broadcasts via WS.
pub async fn apply_buzz_release(state: &AppState, session_id: &str) -> bool {
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
