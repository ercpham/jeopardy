use crate::models::{AppState, Team, WsServerMsg};
use crate::services::ws_broadcast::broadcast;
use crate::services::game_actions::{apply_buzz_lock, apply_buzz_release};
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use chrono::Utc;
use std::sync::Arc;

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
