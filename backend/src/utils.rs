//! Utility functions for the Bible Challenge backend server.
//! Provides session cleanup and other helper functions.

use crate::models::AppState;
use chrono::Utc;

/// Cleans up expired sessions and their associated WebSocket clients.
///
/// A session is considered expired if it has not been modified for 20 minutes.
pub async fn cleanup_sessions(state: &AppState) {
    let mut sessions = state.sessions.write().await;
    let expired: Vec<String> = sessions
        .iter()
        .filter_map(|(id, session_mutex)| {
            let session = futures::executor::block_on(session_mutex.lock());
            let expired = Utc::now()
                .signed_duration_since(session.last_modified)
                .num_seconds()
                >= 20 * 60;
            if expired {
                Some(id.clone())
            } else {
                None
            }
        })
        .collect();

    for id in &expired {
        sessions.remove(id);
    }

    // Clean up WS clients for expired sessions
    if !expired.is_empty() {
        let mut clients = state.ws_clients.write().await;
        for id in &expired {
            clients.remove(id);
        }
    }
}
