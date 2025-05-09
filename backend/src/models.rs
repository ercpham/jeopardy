//! Data models for the Bible Challenge backend server.
//! This module defines the structures used for sessions, scores, and questions.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Represents a question in the Bible Challenge.
///
/// Fields:
/// - `id`: Unique identifier for the question.
/// - `question_text`: The text of the question.
/// - `answer_text`: The answer to the question.
/// - `reference_text`: The reference text for the question.
/// - `revealed`: Whether the answer has been revealed.
#[derive(Serialize, Deserialize)]
pub struct Question {
    pub id: String,
    pub question_text: String,
    pub answer_text: String,
    pub reference_text: String,
    pub revealed: bool,
}

/// Represents a team in the Bible Challenge.
///
/// Fields:
/// - `team_name`: The name of the team.
/// - `score`: The score of the team.
/// - `buzz_lock_owned`: Whether the team owns the buzz lock.
#[derive(Serialize, Deserialize, Clone)]
pub struct Team {
    pub team_name: String,
    pub score: i32,
    pub buzz_lock_owned: bool,
}

/// Represents a session in the Bible Challenge.
///
/// Fields:
/// - `teams`: The list of teams participating in the session.
/// - `buzz_lock`: Whether the buzz lock is currently active.
/// - `created_at`: The timestamp when the session was created.
#[derive(Serialize, Deserialize, Clone)]
pub struct Session {
    pub teams: Vec<Team>,
    pub buzz_lock: bool,
    pub created_at: DateTime<Utc>,
}
