use crate::models::{AppState, WsServerMsg};

/// Broadcasts a server message to all WebSocket clients in a session.
/// Removes clients whose send channel has been closed.
pub async fn broadcast(state: &AppState, session_id: &str, msg: &WsServerMsg) {
    match serde_json::to_string(msg) {
        Ok(payload) => {
            let mut clients = state.ws_clients.write().await;
            if let Some(senders) = clients.get_mut(session_id) {
                senders.retain(|tx| tx.send(payload.clone()).is_ok());
            }
        }
        Err(err) => {
            eprintln!("Failed to serialize WS server msg for broadcast: {}", err);
        }
    }
}
