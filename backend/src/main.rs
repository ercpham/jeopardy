use axum::{
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use std::sync::Mutex;
use once_cell::sync::Lazy;
use std::env;

#[derive(Serialize, Deserialize)]
struct Question {
    id: String,
    question_text: String,
    answer_text: String,
    reference_text: String,
    revealed: bool,
}

#[derive(Serialize, Deserialize, Clone)]
struct Scores {
    team1: i32,
    team2: i32,
    team3: i32,
}

static SCORES: Lazy<Mutex<Scores>> = Lazy::new(|| Mutex::new(Scores {
    team1: 0,
    team2: 0,
    team3: 0,
}));

async fn get_scores() -> Json<Scores> {
    let scores = SCORES.lock().unwrap();
    Json(scores.clone())
}

async fn modify_scores(Json(payload): Json<Scores>) -> Json<Scores> {
    let mut scores = SCORES.lock().unwrap();
    scores.team1 = payload.team1;
    scores.team2 = payload.team2;
    scores.team3 = payload.team3;
    Json(scores.clone())
}

#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/scores", get(get_scores).post(modify_scores))
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string()).parse().expect("Invalid port number");
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Server running at http://{}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}