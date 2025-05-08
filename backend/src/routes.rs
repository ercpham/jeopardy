//! Route handlers for the Bible Challenge backend server.
//! This module defines the HTTP endpoints and their corresponding handlers.

use crate::SESSIONS;
use crate::models::{Session, Team};
use axum::http::StatusCode;
use axum::{Json, extract::Path};
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
        created_at: Utc::now(),
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

/// Retrieves the team information for a given session.
///
/// - Fetches the team information for the specified session ID from the global session map.
///
/// Parameters:
/// - `Path<String>`: The session ID as a path parameter.
///
/// Returns:
/// - `StatusCode::OK` and the team information if the session exists.
/// - `StatusCode::NOT_FOUND` if the session does not exist.
pub async fn get_session_team_info(
    Path(session_id): Path<String>,
) -> impl axum::response::IntoResponse {
    let sessions = SESSIONS.read().await;
    if let Some(session_mutex) = sessions.get(&session_id) {
        let session = session_mutex.lock().await;
        (StatusCode::OK, Json(Some(session.teams.clone())))
    } else {
        (StatusCode::NOT_FOUND, Json(None))
    }
}

/// Modifies the team information for a specific session.
///
/// - Updates the specified team in the session.
///
/// Parameters:
/// - `Path<(String, usize)>`: A tuple containing the session ID and team index as path parameters.
/// - `Json<Team>`: The updated team as a JSON payload.
///
/// Returns:
/// - `StatusCode::OK` and the updated team information if the session and team exist.
/// - `StatusCode::NOT_FOUND` if the session or team does not exist.
pub async fn modify_session_team_info(
    Path((session_id, team_index)): Path<(String, usize)>,
    Json(updated_team): Json<Team>,
) -> impl axum::response::IntoResponse {
    let sessions = SESSIONS.read().await;
    if let Some(session_mutex) = sessions.get(&session_id) {
        let mut session = session_mutex.lock().await;
        if let Some(team) = session.teams.get_mut(team_index) {
            *team = updated_team;
            (StatusCode::OK, Json(Some(team.clone())))
        } else {
            (StatusCode::NOT_FOUND, Json(None))
        }
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

/// Releases the buzz lock for a given session.
///
/// - Sets the buzz lock to false for the session.
/// - Resets the buzz lock ownership for all teams in the session.
///
/// Parameters:
/// - `Path<String>`: The session ID as a path parameter.
///
/// Returns:
/// - `StatusCode::OK` and a success message if the session exists.
/// - `StatusCode::NOT_FOUND` if the session does not exist.
pub async fn release_buzz_lock(
    Path(session_id): Path<String>,
) -> impl axum::response::IntoResponse {
    let sessions = SESSIONS.read().await;
    if let Some(session_mutex) = sessions.get(&session_id) {
        let mut session = session_mutex.lock().await;
        session.buzz_lock = false;
        for team in &mut session.teams {
            team.buzz_lock_owned = false;
        }
        (StatusCode::OK, Json("Buzz lock released"))
    } else {
        (StatusCode::NOT_FOUND, Json("Session not found"))
    }
}

/// Sets the buzz lock ownership for a specific team in a session.
///
/// - Sets the buzz lock to true for the session.
/// - Assigns buzz lock ownership to the specified team.
///
/// Parameters:
/// - `Path<(String, usize)>`: A tuple containing the session ID and team index as path parameters.
///
/// Returns:
/// - `StatusCode::OK` and a success message if the operation succeeds.
/// - `StatusCode::OK` and a failure message if the buzz lock is already set.
/// - `StatusCode::NOT_FOUND` if the session or team does not exist.
pub async fn set_buzz_lock_owned(
    Path((session_id, team_index)): Path<(String, usize)>,
) -> impl axum::response::IntoResponse {
    let sessions = SESSIONS.read().await;
    if let Some(session_mutex) = sessions.get(&session_id) {
        let mut session = session_mutex.lock().await;
        if session.buzz_lock {
            return (StatusCode::OK, Json("Fail"));
        }
        if let Some(team) = session.teams.get_mut(team_index) {
            team.buzz_lock_owned = true;
            session.buzz_lock = true;
            (StatusCode::OK, Json("Success"))
        } else {
            (StatusCode::NOT_FOUND, Json("Team not found"))
        }
    } else {
        (StatusCode::NOT_FOUND, Json("Session not found"))
    }
}
