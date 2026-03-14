//! Data models for the Bible Challenge backend server.
//! This module defines the structures used for sessions, scores, questions,
//! WebSocket messages, and shared application state.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{Mutex as AsyncMutex, RwLock};

/// Represents a question in the Bible Challenge.
#[derive(Serialize, Deserialize)]
pub struct Question {
    pub id: String,
    pub question_text: String,
    pub answer_text: String,
    pub reference_text: String,
    pub revealed: bool,
}

/// Represents a team in the Bible Challenge.
#[derive(Serialize, Deserialize, Clone)]
pub struct Team {
    pub team_name: String,
    pub score: i32,
    pub buzz_lock_owned: bool,
}

/// Represents a session in the Bible Challenge.
#[derive(Serialize, Deserialize, Clone)]
pub struct Session {
    pub teams: Vec<Team>,
    pub buzz_lock: bool,
    pub dark_mode: bool,
    pub timer_enabled: bool,
    pub created_at: DateTime<Utc>,
    pub last_modified: DateTime<Utc>,
}

/// Messages sent from client to server over WebSocket.
#[derive(Deserialize)]
#[serde(tag = "type")]
pub enum WsClientMsg {
    BuzzIn { team_index: usize },
    ReleaseBuzz,
    LockBuzzers,
    UpdateScore { team_index: usize, score: i32 },
    UpdateTeamName { team_index: usize, name: String },
    UpdateDarkMode { enabled: bool },
    UpdateTimerEnabled { enabled: bool },
}

/// Messages sent from server to client over WebSocket.
#[derive(Serialize, Clone)]
#[serde(tag = "type")]
pub enum WsServerMsg {
    FullState { session: Session },
    BuzzLocked { team_index: usize },
    BuzzersLocked,
    BuzzReleased,
    ScoreUpdate { team_index: usize, score: i32 },
    TeamNameUpdate { team_index: usize, name: String },
    DarkModeUpdate { enabled: bool },
    TimerEnabledUpdate { enabled: bool },
    SessionClosed,
}

/// Shared application state injected into route handlers via Axum's State extractor.
pub struct AppState {
    pub sessions: RwLock<HashMap<String, AsyncMutex<Session>>>,
    pub ws_clients: RwLock<HashMap<String, Vec<tokio::sync::mpsc::UnboundedSender<String>>>>,
}

impl AppState {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            sessions: RwLock::new(HashMap::new()),
            ws_clients: RwLock::new(HashMap::new()),
        })
    }
}
