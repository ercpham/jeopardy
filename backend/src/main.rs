//! Main entry point for the Bible Challenge backend server.
//! This module initializes the server, sets up routes, and starts the Axum application.

mod routes;
mod models;
mod utils;

use axum::{Router};
use tower_http::cors::{Any, CorsLayer};
use std::net::SocketAddr;
use std::env;
use std::time::Duration;
use tokio::sync::Mutex as AsyncMutex;
use once_cell::sync::Lazy;
use std::collections::HashMap;

use crate::routes::{start_session, get_session_id, get_session_scores, modify_session_scores, close_session};
use crate::utils::cleanup_sessions;
use crate::models::{Session};

static SESSIONS: Lazy<AsyncMutex<HashMap<String, Session>>> = Lazy::new(|| AsyncMutex::new(HashMap::new()));

/// Main function to start the server.
/// 
/// - Initializes the tracing subscriber for logging.
/// - Configures CORS settings.
/// - Sets up the Axum router with defined routes.
/// - Spawns a background task to clean up expired sessions.
/// - Binds the server to the specified port and starts serving requests.
#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/session/start", axum::routing::post(start_session))
        .route("/session/:id", axum::routing::get(get_session_id))
        .route("/session/:id/scores", axum::routing::get(get_session_scores))
        .route("/session/:id/modify", axum::routing::post(modify_session_scores))
        .route("/session/:id/close", axum::routing::post(close_session))
        .layer(cors);

    tokio::spawn(async {
        loop {
            cleanup_sessions().await;
            tokio::time::sleep(Duration::from_secs(600)).await;
        }
    });

    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string()).parse().expect("Invalid port number");
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Server running at http://{}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}