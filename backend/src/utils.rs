//! Utility functions for the Bible Challenge backend server.
//! This module provides helper functions for session management.

use crate::SESSIONS;
use chrono::Utc;

/// Cleans up expired sessions from the global session map.
/// 
/// - Iterates through all sessions and removes those that have expired.
/// - A session is considered expired if it was created more than 1 hour ago.
pub async fn cleanup_sessions() {
    let mut sessions = SESSIONS.lock().await;
    sessions.retain(|_, session| {
        Utc::now().signed_duration_since(session.created_at).num_seconds() < 3600
    });
}