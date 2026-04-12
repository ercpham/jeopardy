# Bible Challenge — Codebase Context

> Generated context file for AI assistant sessions. Read this at the start of each session to avoid re-exploring the codebase.
> Last updated: 2026-04-12
> Branch: Current development (WebSocket migration, session management, dynamic teams)

---

## Project Purpose

A full-stack, Jeopardy-style Bible quiz game. Features:
- Upload a custom `.tsv` file of Bible questions, answers, and references (with optional categories and point values)
- Play through a dynamic Jeopardy-style board where cells reveal questions
- Real-time multiplayer sessions with any number of teams (up to 3 default) using a 4-character session code
- Physical buzzer mechanism — players join on their own device and buzz in with a large red button
- Track and edit team scores/names in real time across all connected clients
- Synchronized dark mode and timer settings across the session
- Background session cleanup task (removes sessions inactive for 20+ minutes)

---

## Directory Structure

```
bible-challenge/
├── .github/
│   └── prompts/
│       └── plan-bibleChallenge.prompt.md   # AI planning doc for WebSocket migration
├── backend/                                 # Rust/Axum HTTP + WebSocket API server
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs       # Entry point; router setup, 10-min background cleanup loop
│       ├── models.rs     # Data models: Session, Team, WsClientMsg, WsServerMsg
│       ├── routes.rs     # HTTP route handlers + WebSocket connection/broadcast logic
│       └── utils.rs      # cleanup_sessions() — removes sessions inactive 20+ min
├── frontend/                                # React/TypeScript/Vite SPA
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   ├── .env                                 # VITE_API_URL (gitignored)
│   ├── public/
│   │   ├── favicon.ico
│   │   └── sounds/buzz.mp3                  # Played when a team buzzes in
│   ├── examples/                            # Example .tsv files for testing
│   └── src/
│       ├── main.tsx                         # React root; wraps App in all providers
│       ├── App.tsx                          # Root component; routing, mobile landing, menu/settings
│       ├── pages/
│       │   ├── Home.tsx                     # Main board view (Host mode)
│       │   ├── QuestionPage.tsx             # Single question/reveal view
│       │   └── BuzzerPage.tsx               # Player's buzzer interface (Player mode)
│       ├── components/
│       │   ├── Board.tsx                    # Jeopardy board grid (complex computation)
│       │   ├── Menu.tsx                     # Sidebar; TSV upload, session management
│       │   ├── Question.tsx                 # Presentational question/answer component
│       │   ├── Score.tsx                    # Team scorecard with controls
│       │   ├── ScoreContainer.tsx           # Layout for multiple scores
│       │   ├── Settings.tsx                 # Settings modal; dark mode & timer toggles
│       │   ├── ConnectionIndicator.tsx      # WebSocket status heartbeat UI
│       │   └── BuzzFeedback.tsx             # Visual "Who buzzed first?" feedback
│       ├── context/
│       │   ├── SessionContext.tsx           # WebSocket lifecycle (Connection, Heartbeat, full state)
│       │   ├── TeamContext.tsx              # Team state + buzzer logic (WebSocket events)
│       │   ├── PageContext.tsx              # Tracks current navigation state for server sync
│       │   ├── SettingsContext.tsx          # LocalStorage + WebSocket synced settings
│       │   ├── QuestionsContext.tsx         # Questions array (client-side only)
│       │   └── BoardContext.tsx             # Clicked cells, target score, edited categories
│       └── styles/                          # Component-specific CSS files
```

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Language | Rust (2024 edition) |
| HTTP/WS framework | Axum 0.6 |
| Async runtime | Tokio (full features) |
| Serialization | serde + serde_json |
| CORS | tower-http 0.4 (Allows any origin) |
| Timestamps | chrono 0.4 |
| WebSocket | axum::extract::ws (Manual ping/pong & message handling) |
| Random | rand 0.9 (Alphanumeric session codes) |

### Frontend
| Layer | Technology |
|---|---|
| Language | TypeScript 5.7 |
| UI framework | React 19 |
| Routing | React Router DOM 7.5 |
| Build tool | Vite 6 |
| Styling | Plain CSS with CSS Custom Properties (Variables) |
| Icons | Lucide React |
| State | React Context API (7 contexts) |
| Networking | Native Fetch API + WebSocket |

---

## Architecture

- **Real-time Synchronization**: All game state (except questions) is stored in the backend's in-memory `SESSIONS` map. Any change (score, team name, buzz) is broadcast to all connected WebSocket clients in that session.
- **Client-Side Question State**: Questions never touch the backend. They are parsed from TSV client-side and stored in `QuestionsContext`.
- **Hybrid Buzzer Logic**:
  - **Solo**: Buzzes and score changes happen purely in local React state.
  - **Connected**: Buzzers use a race-condition-safe Mutex on the server. The first `BuzzIn` message locks the session; subsequent buzzes are ignored until released by the host.
- **Mobile Friendly**: App detects route and state to show a "Join Session" landing page on mobile devices, serving as a dedicated buzzer remote.

---

## Backend API Routes

| Method | Path | Description |
|---|---|---|
| POST | `/session/start` | Creates session; returns 4-char ID and 3 default teams |
| GET | `/session/:id` | Validates session existence |
| GET | `/session/:id/teams` | Returns all team states (Teams + Scores) |
| PUT | `/session/:id/teams/:idx`| Updates a specific team (Score/Name) |
| POST | `/session/:id/close` | Notifies WS clients and deletes session |
| POST | `/session/:id/buzz/:idx` | HTTP fallback for team buzz-in |
| POST | `/session/:id/buzz/release`| Releases the buzz lock |
| GET | `/session/:id/ws` | **WebSocket upgrade endpoint** (Heartbeat + All game events) |

---

## Data Models (`backend/src/models.rs`)

```rust
struct Session {
    teams: Vec<Team>,
    buzz_lock: bool,
    dark_mode: bool,
    timer_enabled: bool,
    current_page: String,
    created_at: DateTime<Utc>,
    last_modified: DateTime<Utc>,
}

struct Team {
    team_name: String,
    score: i32,
    buzz_lock_owned: bool,
    has_buzzed: bool,
    last_buzz_attempt: Option<DateTime<Utc>>,
}
```

---

## Frontend Context Provider Order (`frontend/src/main.tsx`)

```
BrowserRouter
  └── SessionProvider (WebSocket management)
        └── PageProvider (Navigation state)
              └── SettingsProvider (Theme/Timer)
                    └── TeamProvider (Score/Buzz logic)
                          └── QuestionsProvider (TSV Data)
                                └── BoardProvider (Grid State)
                                      └── App
```

---

## Key Component Details

### `Board.tsx` (Grid Logic)
- Dynamically computes grid size:
  - If TSV has `Category` column: Creates columns per category, rows per max questions in any category.
  - No categories: Attempts to fit questions into 5, 4, or 3 rows automatically.
- Supports **inline category editing**: Changes are stored in `BoardContext`.
- Renders empty "blank" cells to maintain grid integrity.

### `Menu.tsx` (Parser)
- Parses TSV files. Checks for `Question`, `Answer`, `Reference`, `Category`, and `Point Value`.
- Automatically sorts questions by Point Value (ASC) if present.
- Handles Session Start/Join/Close and Board Resets.

### `SessionContext.tsx`
- Manages the primary WebSocket connection.
- Implements a 30s heartbeat (Ping/Pong) to keep the connection alive.
- Exposes `addWsListener` to allow other contexts (Team, Settings) to react to server broadcasts.

### `BuzzerPage.tsx`
- Optimized for mobile/player view.
- Features a large, high-contrast buzzer button.
- Shows real-time connection status and visual buzz-in feedback.

---

## Environment Variables

| Variable | Location | Purpose | Default |
|---|---|---|---|
| `PORT` | Backend env | Port for Axum server | `3000` |
| `VITE_API_URL` | `frontend/.env` | API & WebSocket Base URL | `http://127.0.0.1:3000` |

---

## Notable Gaps / Future Work

- **In-Memory Volatility**: Server restarts wipe all active sessions.
- **TSV Column Names**: Parser currently expects exact matches (e.g. "Question" vs "Questions").
- **3-Team Default**: While backend supports dynamic teams, frontend defaults to 3 on start.
- **No Persistence**: Questions are lost on page refresh (unless saved in browser session).
