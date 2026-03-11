//! Utility functions for the Bible Challenge backend server.
//! This module provides helper functions for session management.

use crate::SESSIONS;
use chrono::Utc;

/// Cleans up expired sessions from the global session map.
///
/// - Iterates through all sessions and removes those that have been inactive.
/// - A session is considered inactive if it has not been modified for 20 minutes.
///   The `last_modified` field is updated whenever the session is changed.

pub async fn cleanup_sessions() {
    let mut sessions = SESSIONS.write().await;
    sessions.retain(|_, session_mutex| {
        let session = futures::executor::block_on(session_mutex.lock());
        Utc::now()
            .signed_duration_since(session.last_modified)
            .num_seconds()
            < 20 * 60 // 20 minutes
    });
}
