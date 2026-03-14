# Bible Challenge — Codebase Context

> Generated context file for AI assistant sessions. Read this at the start of each session to avoid re-exploring the codebase.
> Last updated: 2026-03-14
> Branch: Current development (WebSocket migration complete, Settings/Dark mode added)

---

## Project Purpose

A full-stack, Jeopardy-style Bible quiz game. Features:
- Upload a custom `.tsv` file of Bible questions, answers, and references (with optional categories and point values)
- Play through a dynamic Jeopardy-style board where cells reveal questions
- Real-time multiplayer sessions (up to 3 teams) using a 4-character session code
- Physical buzzer mechanism — players join on their own device and buzz in with a large red button
- Track and edit team scores in real time
- Can also be played solo (no backend session required)

---

## Directory Structure

```
bible-challenge/
├── .github/
│   └── prompts/
│       └── plan-bibleChallenge.prompt.md   # AI planning doc for WebSocket migration
├── backend/                                 # Rust/Axum HTTP API server
│   ├── Cargo.toml
│   ├── Cargo.lock
│   └── src/
│       ├── main.rs       # Entry point, router setup, 10-min session cleanup task
│       ├── models.rs     # Data models: Question, Team, Session
│       ├── routes.rs     # All 7 HTTP route handlers
│       └── utils.rs      # cleanup_sessions() — removes sessions inactive 20+ min
├── frontend/                                # React/TypeScript/Vite SPA
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json / tsconfig.app.json
│   ├── eslint.config.js
│   ├── package.json
│   ├── .env                                 # VITE_API_URL (gitignored)
│   ├── PLAN.md                              # Developer planning doc
│   ├── public/
│   │   ├── favicon.ico
│   │   └── sounds/buzz.mp3                  # Played when a team buzzes in
│   ├── examples/                            # 30 example .tsv files for testing
│   └── src/
│       ├── main.tsx                         # React root; wraps App in all providers
│       ├── App.tsx                          # Root component, routing, top-level state
│       ├── components/
│       │   ├── Board.tsx                    # Jeopardy board grid (most complex component)
│       │   ├── Menu.tsx                     # Slide-out sidebar; TSV upload, session controls
│       │   ├── Question.tsx                 # Individual question display page
│       │   ├── Score.tsx                    # Single team scorecard
│       │   ├── ScoreContainer.tsx           # Container for all 3 scorecards
│       │   └── Settings.tsx                 # Settings modal; dark mode & timer toggles
│       ├── context/
│       │   ├── SessionContext.tsx           # Session lifecycle (WebSocket-based); start/join/close
│       │   ├── TeamContext.tsx              # Team state + buzz-in logic; WebSocket events
│       │   ├── QuestionsContext.tsx         # Questions array management
│       │   ├── BoardContext.tsx             # Clicked cells, recently clicked, target score
│       │   └── SettingsContext.tsx          # Dark mode & timer settings; localStorage persistent
│       ├── data/
│       │   ├── sample_questions.json        # Built-in 30-question dataset (6 cats × 5 rows)
│       │   └── qa.tsv                       # Same data in TSV format
│       └── styles/
│           ├── App.css
│           ├── Board.css
│           ├── BuzzerPage.css
│           ├── Menu.css
│           ├── Question.css
│           ├── Score.css
│           ├── ScoreContainer.css
│           └── Settings.css
```

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Language | Rust (2024 edition) |
| HTTP framework | Axum 0.6 |
| Async runtime | Tokio (full features) |
| Serialization | serde + serde_json |
| CORS middleware | tower-http 0.4 (CorsLayer — allows any origin) |
| Timestamps | chrono 0.4 |
| Static global state | once_cell (Lazy) |
| Concurrency | `tokio::sync::RwLock` (sessions map) + `tokio::sync::Mutex` (per-session) |
| Random | rand 0.9 (4-char alphanumeric session codes) |
| Logging | tracing + tracing-subscriber |

### Frontend
| Layer | Technology |
|---|---|
| Language | TypeScript ~5.7 |
| UI framework | React 19 |
| Routing | React Router DOM 7.5 |
| Build tool | Vite 6 + @vitejs/plugin-react |
| Linting | ESLint 9 (flat config) + typescript-eslint + react-hooks/refresh/x/dom plugins |
| Formatting | Prettier 3.5 |
| Styling | Plain CSS (no framework or preprocessor); CSS custom properties for theming |
| Fonts | Google Fonts (Lato) from CDN |
| State management | React Context API (5 contexts) |
| Real-time comms | WebSocket API (replaces HTTP polling) |
| Data fetching | Native Fetch API + WebSocket |

---

## Architecture

- **Monorepo**: Two sub-projects (`backend/`, `frontend/`) in one git repo.
- **REST API**: 7 stateless Axum handlers over in-memory shared state.
- **Global state (backend)**: `SESSIONS: Lazy<RwLock<HashMap<String, AsyncMutex<Session>>>>` — wiped on server restart; no database.
- **Question storage**: Client-side only (React state). Questions never go to the backend.
- **Real-time**: WebSocket-based communication in `SessionContext` and `TeamContext` (HTTP polling migration complete).
- **Two operation modes**:
  - **Host mode**: Full Jeopardy board + all team scorecards with controls.
  - **Player/Buzzer mode**: Large red buzzer button + own team's score only.
- **Solo play**: Works without a backend session — all buzz/score state is local.

---

## Backend API Routes (`backend/src/routes.rs`)

| Method | Path | Description |
|---|---|---|
| POST | `/session/start` | Create session → returns 4-char code, 3 default teams |
| GET | `/session/:id` | Get session info |
| DELETE | `/session/:id` | Close/delete session |
| GET | `/session/:id/teams` | Get all team states (polled every 200ms by clients) |
| PUT | `/session/:id/teams` | Update all teams (scores, names) |
| POST | `/session/:id/buzz/:index` | Team at index buzzes in (race-condition-safe via per-session mutex) |
| POST | `/session/:id/buzz/release` | Host releases buzz lock |

---

## Data Models (`backend/src/models.rs`)

```rust
struct Session {
    teams: Vec<Team>,
    buzz_lock: bool,
    created_at: DateTime<Utc>,
    last_active: DateTime<Utc>,
}

struct Team {
    name: String,
    score: i32,
    buzz_lock_owned: bool,
}
```

Questions are only used client-side (TypeScript).

---

## Frontend Context Provider Order (`frontend/src/main.tsx`)

```
BrowserRouter
  └── SessionProvider
        └── SettingsProvider           (uses useSession)
              └── TeamProvider          (uses useSession)
                    └── QuestionsProvider
                          └── BoardProvider
                                └── App
```

Each context exports a `useFoo()` hook that throws if used outside its provider.

---

## Key Component Details

### `Board.tsx` (most complex component)
- Uses `useMemo` to compute grid layout from questions array.
- If questions have `category`: groups by category (columns), fills to max row count.
- If no categories: auto-fits into grid trying row counts 5, 4, 3.
- Renders CSS Grid using inline `--num-columns` / `--num-rows` CSS variables.
- Category headers are **inline-editable** (click → input → blur/Enter).
- Clicked cells tracked in `BoardContext`, visually dimmed.
- Point values: `(rowIndex + 1) * 100` or question's `pointValue` if present.

### `Menu.tsx` — TSV Parser
- Reads header row to detect optional `Category` and `Point Value` columns.
- Maps rows to `Question` objects.
- If both `Category` and `Point Value` present: sorts by `pointValue` asc, then `category` asc.
- Calls `setQuestions` then `handleResetBoardState` after parsing.

### `TeamContext.tsx` — WebSocket + Buzzer
- Manages team state and buzz-in mechanics via WebSocket messages.
- Plays `buzz.mp3` once when any team gets `buzz_lock_owned: true`.
- `buzzIn(teamIndex)`: local if no session; otherwise sends WebSocket message to API.
- `releaseBuzzLock()`: local or sends WebSocket message to `/session/:id/buzz/release`.
- On connection error: clears sessionId, resets state, stops listening.

### `Score.tsx` / `ScoreContainer.tsx`
- Host mode: all 3 teams, +/– controls, score input pre-filled with `targetScore`.
- Player mode: own team only, no controls.
- Team names inline-editable (click → input → blur/Enter).
- Team card glows blue when that team owns buzz lock.

---

## Patterns and Conventions

- **Context + custom hook**: Every context has a paired `useFoo()` hook with provider guard.
- **Dual-mode actions**: Every action in `TeamContext` branches on whether a session exists (local vs. API).
- **`useMemo` for grid computation**: Board layout only recomputes when `questions` changes.
- **CSS custom properties for grid**: `--num-columns`, `--num-rows` set as inline styles.
- **Responsive font sizing**: `calc(base + viewport-unit)` (e.g., `calc(1.5rem + 1vw)`).
- **Animation trigger pattern**: `triggerAnimation` set `true`, then reset to `false` after 10ms.
- **Inline editing pattern**: Local state tracks editing mode; blur or Enter commits.
- **Rust two-level locking**: Outer `RwLock` on sessions map + inner `AsyncMutex` per session.

---

## Environment Variables

| Variable | Location | Purpose | Default |
|---|---|---|---|
| `PORT` | Backend env | Port for Axum server | `3000` |
| `VITE_API_URL` | `frontend/.env` | Base URL for all API calls | `http://127.0.0.1:3000` |

Production backend URL (Render.com): `https://bible-jeopardy-backend.onrender.com` (commented out in `.env`).

---

## Available Scripts

### Frontend
```bash
npm run dev        # Vite dev server (hot reload)
npm run build      # tsc -b && vite build → dist/
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Backend
```bash
cargo run          # Debug mode, port 3000
cargo build --release
cargo check        # Fast type/borrow check
```

---

## Notable Gaps / Future Work

- **No test suite** — no automated tests for frontend or backend.
- **No Docker / CI/CD** — manual deployment to Render.com.
- **In-memory only** — all session state lost on server restart.
- **3-team limit** — hardcoded in backend session creation.
