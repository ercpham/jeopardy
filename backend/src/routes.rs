//! Route handlers for the Bible Challenge backend server.
//! This module defines the HTTP endpoints and their corresponding handlers.

use axum::{Json, extract::Path};
use axum::http::StatusCode;
use crate::models::{Scores, Session};
use crate::SESSIONS;
use chrono::Utc;
use tokio::sync::Mutex as AsyncMutex;

/// Starts a new session and returns the session ID.
/// 
/// - Generates a unique session ID.
/// - Initializes a new session with default scores.
/// - Stores the session in the global session map.
/// 
/// Returns:
/// - `Json<String>`: The session ID as a JSON response.
pub async fn start_session() -> Json<String> {
    let session_id = uuid::Uuid::new_v4().to_string();
    let session = Session {
        scores: Scores {
            team1: 0,
            team2: 0,
            team3: 0,
        },
        created_at: Utc::now(),
    };
    let mut sessions = SESSIONS.write().await;
    sessions.insert(session_id.clone(), AsyncMutex::new(session));
    Json(session_id)
}

/// Retrieves the session ID if it exists.
/// 
/// - Checks if the session ID exists in the global session map.
/// 
/// Parameters:
/// - `Path<String>`: The session ID as a path parameter.
/// 
/// Returns:
/// - `StatusCode::OK` and the session ID if found.
/// - `StatusCode::NOT_FOUND` if the session ID does not exist.
pub async fn get_session_id(Path(session_id): Path<String>) -> impl axum::response::IntoResponse {
    let sessions = SESSIONS.read().await;
    if sessions.contains_key(&session_id) {
        (StatusCode::OK, Json(Some(session_id)))
    } else {
        (StatusCode::NOT_FOUND, Json(None))
    }
}

/// Retrieves the scores for a given session.
/// 
/// - Fetches the scores for the specified session ID from the global session map.
/// 
/// Parameters:
/// - `Path<String>`: The session ID as a path parameter.
/// 
/// Returns:
/// - `StatusCode::OK` and the scores if the session exists.
/// - `StatusCode::NOT_FOUND` if the session does not exist.
pub async fn get_session_scores(Path(session_id): Path<String>) -> impl axum::response::IntoResponse {
    let sessions = SESSIONS.read().await;
    if let Some(session_mutex) = sessions.get(&session_id) {
        let session = session_mutex.lock().await;
        (StatusCode::OK, Json(Some(session.scores.clone())))
    } else {
        (StatusCode::NOT_FOUND, Json(None))
    }
}

/// Modifies the scores for a given session.
/// 
/// - Updates the scores for the specified session ID in the global session map.
/// 
/// Parameters:
/// - `Path<String>`: The session ID as a path parameter.
/// - `Json<Scores>`: The new scores as a JSON payload.
/// 
/// Returns:
/// - `StatusCode::OK` and the updated scores if the session exists.
/// - `StatusCode::NOT_FOUND` if the session does not exist.
pub async fn modify_session_scores(Path(session_id): Path<String>, Json(payload): Json<Scores>) -> impl axum::response::IntoResponse {
    let sessions = SESSIONS.read().await;
    if let Some(session_mutex) = sessions.get(&session_id) {
        let mut session = session_mutex.lock().await;
        session.scores.team1 = payload.team1;
        session.scores.team2 = payload.team2;
        session.scores.team3 = payload.team3;
        (StatusCode::OK, Json(Some(session.scores.clone())))
    } else {
        (StatusCode::NOT_FOUND, Json(None))
    }
}

/// Closes a session and removes it from the global session map.
/// 
/// Parameters:
/// - `Path<String>`: The session ID as a path parameter.
/// 
/// Returns:
/// - `StatusCode::OK` if the session was successfully removed.
/// - `StatusCode::NOT_FOUND` if the session does not exist.
pub async fn close_session(Path(session_id): Path<String>) -> impl axum::response::IntoResponse {
    let mut sessions = SESSIONS.write().await;
    if sessions.remove(&session_id).is_some() {
        (StatusCode::OK, Json(true))
    } else {
        (StatusCode::NOT_FOUND, Json(false))
    }
}