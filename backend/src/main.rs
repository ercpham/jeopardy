//! Main entry point for the Bible Challenge backend server.
//! Initializes the Axum application with HTTP routes, WebSocket support,
//! shared state, CORS, and a background session cleanup task.

mod models;
mod routes;
mod utils;

use axum::Router;
use std::env;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tower_http::cors::{Any, CorsLayer};

use crate::models::AppState;
use crate::routes::{
    close_session, get_session_id, get_session_team_info, modify_session_team_info,
    release_buzz_lock, set_buzz_lock_owned, start_session, ws_handler,
};
use crate::utils::cleanup_sessions;

#[tokio::main]
async fn main() {
    let state: Arc<AppState> = AppState::new();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/session/start", axum::routing::post(start_session))
        .route("/session/:id", axum::routing::get(get_session_id))
        .route("/session/:id/teams", axum::routing::get(get_session_team_info))
        .route(
            "/session/:id/teams/:index",
            axum::routing::put(modify_session_team_info),
        )
        .route("/session/:id/close", axum::routing::post(close_session))
        .route(
            "/session/:id/buzz/release",
            axum::routing::post(release_buzz_lock),
        )
        .route(
            "/session/:id/buzz/:index",
            axum::routing::post(set_buzz_lock_owned),
        )
        .route("/session/:id/ws", axum::routing::get(ws_handler))
        .layer(cors)
        .with_state(state.clone());

    let cleanup_state = state.clone();
    tokio::spawn(async move {
        loop {
            cleanup_sessions(&cleanup_state).await;
            tokio::time::sleep(Duration::from_secs(600)).await;
        }
    });

    let port = env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse()
        .expect("Invalid port number");
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Server running at http://{}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
