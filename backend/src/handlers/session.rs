use crate::models::{AppState, Session, Team, WsServerMsg, StartSessionResponse};
use crate::services::ws_broadcast::broadcast;
use axum::extract::{Path, State, Query};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use chrono::Utc;
use rand::{distr::Alphabetic, Rng};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex as AsyncMutex;

/// `POST /session/start` — creates a new session and returns its ID and host token.
pub async fn start_session(State(state): State<Arc<AppState>>) -> Json<StartSessionResponse> {
    let session_id: String = rand::rng()
        .sample_iter(&Alphabetic)
        .take(4)
        .map(char::from)
        .collect();
    let mut session_id = session_id.to_uppercase();

    let host_token: String = rand::rng()
        .sample_iter(&Alphabetic)
        .take(16)
        .map(char::from)
        .collect();

    let now = Utc::now();
    let session = Session {
        created_at: now,
        last_modified: now,
        buzz_lock: false,
        dark_mode: false,
        timer_enabled: false,
        current_page: "home".to_string(),
        teams: vec![
            Team {
                team_name: "Team 1".to_string(),
                score: 0,
                buzz_lock_owned: false,
                has_buzzed: false,
                last_buzz_attempt: None,
            },
            Team {
                team_name: "Team 2".to_string(),
                score: 0,
                buzz_lock_owned: false,
                has_buzzed: false,
                last_buzz_attempt: None,
            },
            Team {
                team_name: "Team 3".to_string(),
                score: 0,
                buzz_lock_owned: false,
                has_buzzed: false,
                last_buzz_attempt: None,
            },
        ],
    };
    {
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
    }
    {
        let mut tokens = state.host_tokens.write().await;
        tokens.insert(session_id.clone(), host_token.clone());
    }
    Json(StartSessionResponse {
        session_id,
        host_token,
    })
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

/// `POST /session/:id/close` — closes session, notifies WS clients, and removes it.
/// Requires the correct 'token' query parameter.
pub async fn close_session(
    State(state): State<Arc<AppState>>,
    Path(session_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let provided_token = params.get("token");
    let tokens = state.host_tokens.read().await;
    let authorized = match (provided_token, tokens.get(&session_id)) {
        (Some(pt), Some(st)) => pt == st,
        _ => false,
    };

    if !authorized {
        return (StatusCode::UNAUTHORIZED, Json(false));
    }
    // Drop the read lock so we can write
    drop(tokens);

    // Notify all connected WS clients before removal
    broadcast(&state, &session_id, &WsServerMsg::SessionClosed).await;

    // Remove WS clients
    state.ws_clients.write().await.remove(&session_id);

    // Remove host token
    state.host_tokens.write().await.remove(&session_id);

    // Remove session
    let removed = state.sessions.write().await.remove(&session_id).is_some();
    if removed {
        (StatusCode::OK, Json(true))
    } else {
        (StatusCode::NOT_FOUND, Json(false))
    }
}
