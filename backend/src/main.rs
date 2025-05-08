//! Main entry point for the Bible Challenge backend server.
//! This module initializes the server, sets up routes, and starts the Axum application.

mod models;
mod routes;
mod utils;

use axum::Router;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::env;
use std::net::SocketAddr;
use std::time::Duration;
use tokio::sync::{Mutex as AsyncMutex, RwLock};
use tower_http::cors::{Any, CorsLayer};

use crate::models::Session;
use crate::routes::{
    close_session, get_session_id, get_session_team_info, modify_session_team_info,
    release_buzz_lock, set_buzz_lock_owned, start_session,
};
use crate::utils::cleanup_sessions;

static SESSIONS: Lazy<RwLock<HashMap<String, AsyncMutex<Session>>>> =
    Lazy::new(|| RwLock::new(HashMap::new()));

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

    let routes = vec![
        ("/session/start", axum::routing::post(start_session)),
        ("/session/:id", axum::routing::get(get_session_id)),
        (
            "/session/:id/teams",
            axum::routing::get(get_session_team_info),
        ),
        (
            "/session/:id/teams/:index",
            axum::routing::put(modify_session_team_info),
        ),
        ("/session/:id/close", axum::routing::post(close_session)),
        (
            "/session/:id/buzz/release",
            axum::routing::post(release_buzz_lock),
        ),
        (
            "/session/:id/buzz/:index",
            axum::routing::post(set_buzz_lock_owned),
        ),
    ];

    let app = routes
        .into_iter()
        .fold(Router::new(), |router, (path, method)| {
            router.route(path, method)
        })
        .layer(cors);

    tokio::spawn(async {
        loop {
            cleanup_sessions().await;
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
