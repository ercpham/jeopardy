//! Data models for the Bible Challenge backend server.
//! This module defines the structures used for sessions, scores, and questions.

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

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

/// Represents the scores for a session.
/// 
/// Fields:
/// - `team1`: Score for team 1.
/// - `team2`: Score for team 2.
/// - `team3`: Score for team 3.
#[derive(Serialize, Deserialize, Clone)]
pub struct Scores {
    pub team1: i32,
    pub team2: i32,
    pub team3: i32,
}

/// Represents a session in the Bible Challenge.
/// 
/// Fields:
/// - `scores`: The scores for the session.
/// - `created_at`: The timestamp when the session was created.
#[derive(Serialize, Deserialize, Clone)]
pub struct Session {
    pub scores: Scores,
    pub created_at: DateTime<Utc>,
}