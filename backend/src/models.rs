//! Data models for the Bible Challenge backend server.
//! This module defines the structures used for sessions, scores, questions,
//! WebSocket messages, and shared application state.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{Mutex as AsyncMutex, RwLock};
use ts_rs::TS;

/// Represents a team in the Bible Challenge.
#[derive(Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct Team {
    pub team_name: String,
    pub score: i32,
    pub buzz_lock_owned: bool,
    pub has_buzzed: bool,
    #[ts(type = "string | null")]
    #[serde(default)]
    pub last_buzz_attempt: Option<DateTime<Utc>>,
}

/// Represents a session in the Bible Challenge.
#[derive(Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct Session {
    pub teams: Vec<Team>,
    pub buzz_lock: bool,
    pub dark_mode: bool,
    pub timer_enabled: bool,
    pub current_page: String,
    #[ts(type = "string")]
    pub created_at: DateTime<Utc>,
    #[ts(type = "string")]
    pub last_modified: DateTime<Utc>,
}

/// Messages sent from client to server over WebSocket.
#[derive(Deserialize, TS)]
#[serde(tag = "type")]
#[ts(export)]
pub enum WsClientMsg {
    BuzzIn {
        team_index: usize,
        client_timestamp: String,
    },
    ReleaseBuzz,
    LockBuzzers,
    UpdateScore {
        team_index: usize,
        score: i32,
    },
    UpdateTeamName {
        team_index: usize,
        name: String,
    },
    UpdateDarkMode {
        enabled: bool,
    },
    UpdateTimerEnabled {
        enabled: bool,
    },
    AddTeam,
    RemoveTeam {
        team_index: usize,
    },
    ResetHasBuzzed,
    SetPage {
        page: String,
    },
    Ping {
        client_timestamp: String,
    },
}

/// Messages sent from server to client over WebSocket.
#[derive(Serialize, Clone, TS)]
#[serde(tag = "type")]
#[ts(export)]
pub enum WsServerMsg {
    FullState {
        session: Session,
    },
    BuzzLocked {
        team_index: usize,
        #[ts(type = "string")]
        server_timestamp: DateTime<Utc>,
        client_timestamp: String,
        team_name: String,
    },
    BuzzersLocked,
    BuzzReleased,
    ScoreUpdate {
        team_index: usize,
        score: i32,
    },
    TeamNameUpdate {
        team_index: usize,
        name: String,
    },
    DarkModeUpdate {
        enabled: bool,
    },
    TimerEnabledUpdate {
        enabled: bool,
    },
    TeamAdded {
        team: Team,
    },
    TeamRemoved {
        team_index: usize,
    },
    HasBuzzedReset,
    PageUpdate {
        page: String,
    },
    SessionClosed,
    Pong {
        #[ts(type = "string")]
        server_timestamp: DateTime<Utc>,
        client_timestamp: String,
    },
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
