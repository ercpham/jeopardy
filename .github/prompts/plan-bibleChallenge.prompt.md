# Plan: Migrate Bible Challenge to WebSocket Real-Time Updates

## TL;DR
Convert buzz, scoring, and team updates from HTTP polling to a broadcast WebSocket model. Keep session creation/closure as HTTP endpoints. One WebSocket connection per session serves all teams with automatic real-time state propagation.

## Steps

### Phase 1: Backend Infrastructure (Core Plumbing)
1. Add WebSocket dependencies to backend/Cargo.toml — `axum::extract::ws` is built-in; no extra crate needed
2. Create WebSocket message types in backend/src/models.rs:
   - **Client → Server enum:** `WsClientMsg { BuzzIn, ReleaseBuzz, UpdateScore(u32), UpdateTeamName(String) }`
   - **Server → Client enum:** `WsServerMsg { FullState(Session), BuzzLocked(usize), BuzzReleased, ScoreUpdate(usize, u32), TeamNameUpdate(usize, String), SessionClosed }`
   - Serialize both enums as JSON with a `type` discriminator field
3. Create shared app state in backend/src/main.rs:
   - `HashMap<SessionId, Vec<WebSocketSink>>` to track connected clients per session
   - Wrap in `Arc<RwLock<...>>` and inject via Axum's `State` extractor
4. Implement WebSocket route handler in backend/src/routes.rs:
   - Route: `GET /session/:id/ws`
   - On connect: validate session exists, send `FullState` to new client, register in client map
   - On inbound message: parse `WsClientMsg`, validate against current state, apply change, broadcast resulting `WsServerMsg` to all clients in session
   - On disconnect: remove client from map
5. Add heartbeat: server sends Ping frame every 30s, closes connection on missing Pong response
6. Add buzz rate limiting: debounce/cooldown per session to prevent spam

### Phase 2: Backward Compatibility (Keep HTTP)
7. Extract shared state-update logic into internal functions:
   - `apply_buzz_lock(session_id, team_index)` → updates state + broadcasts `BuzzLocked`
   - `apply_buzz_release(session_id)` → updates state + broadcasts `BuzzReleased`
   - `apply_score_update(session_id, team_index, score)` → updates state + broadcasts `ScoreUpdate`
   - `apply_team_name_update(session_id, team_index, name)` → updates state + broadcasts `TeamNameUpdate`
8. Existing PUT/POST handlers call these shared functions — ensures HTTP and WebSocket paths stay in sync
9. On `POST /session/:id/close` → send `SessionClosed` to all connected WS clients, then disconnect them

### Phase 3: Frontend WebSocket Client
10. Update frontend/src/context/SessionContext.tsx:
    - After `/session/start` succeeds, open WebSocket: `new WebSocket('ws://server/session/:id/ws')`
    - Store WebSocket instance and connection status in context state
    - Implement auto-reconnect with exponential backoff (1s, 2s, 4s, max 30s)
    - On reconnect, server sends `FullState` to resync client
    - Clean up on unmount / session close
11. Update frontend/src/context/TeamContext.tsx:
    - `buzzIn()` sends `WsClientMsg::BuzzIn` via WebSocket (not HTTP POST)
    - `releaseBuzz()`, `updateTeamScore()`, `updateTeamName()` send via WebSocket
    - Listen for `WsServerMsg` broadcasts and update React state accordingly
    - Remove any HTTP polling logic; WebSocket push replaces it
12. Handle `SessionClosed` message → navigate user to session-end screen or show modal

### Phase 4: Testing & Validation
13. Manual test scenario: Open session in 3 browser tabs (3 teams), verify:
    - Team A buzzes → all 3 tabs immediately show buzz locked on Team A
    - Admin releases buzz → all 3 tabs immediately show buzz released
    - Team B updates score → all 3 tabs show updated score instantly
    - Team C changes name → all 3 tabs show new name instantly
14. Reconnect scenario: Close and reopen a tab mid-session → verify client resyncs via `FullState`
15. Verify HTTP endpoints still work alongside WebSocket:
    - Update via HTTP PUT → verify WebSocket clients receive the broadcast
    - Update via WebSocket → verify HTTP GET returns updated state
16. Session close: Trigger close → verify all WS clients receive `SessionClosed` and disconnect cleanly

## Relevant Files
- backend/Cargo.toml — WebSocket dependencies (none new; `axum::extract::ws` is built-in)
- backend/src/models.rs — `WsClientMsg`, `WsServerMsg` enums, `Session` structure extended for client registry
- backend/src/routes.rs — New WebSocket route handler + refactored shared state-update functions
- backend/src/main.rs — Shared app state with session-to-clients registry, Axum `State` injection
- backend/src/utils.rs — Session cleanup updates (drain/disconnect WS clients on session close)
- frontend/src/context/SessionContext.tsx — WebSocket init, reconnect logic, cleanup
- frontend/src/context/TeamContext.tsx — Replace HTTP calls with WebSocket send/receive

## Verification
1. ✓ Session creation via `POST /session/start` still works (HTTP)
2. ✓ WebSocket connection established from frontend after session ID obtained
3. ✓ Server sends `FullState` on new WS connection so client is immediately in sync
4. ✓ Multiple clients in same session all receive real-time updates (buzz, score, team name)
5. ✓ Buzz lock: first client to send buzz message owns lock; broadcast to all; others see "locked"
6. ✓ Score update from any client propagates instantly to all clients in session
7. ✓ Client disconnect handled gracefully; remaining connected clients still receive updates
8. ✓ Backward compat: HTTP PUT requests still work and trigger WebSocket broadcasts
9. ✓ Reconnect with exponential backoff; state resyncs via `FullState` on reconnect
10. ✓ Session close via `POST /session/:id/close` sends `SessionClosed` and cleans up all WS connections
11. ✓ Buzz rate limiting prevents spam

## Decisions
- **Single WebSocket per session** (not per team) reduces connection overhead; backend routes messages by team ID
- **Broadcast to all clients** — higher bandwidth but simplest consistency model; no polling overhead
- **Keep HTTP endpoints** — allows gradual rollout; old clients unaffected; internal logic shared between HTTP and WebSocket
- **In-memory registry** — simplest for MVP; scales to ~100 concurrent sessions; no persistence layer needed (matches current design)
- **Reuse existing Session/Team structures** — WebSocket layer is transport; state model unchanged
- **Heartbeat in MVP** — not optional; prevents stale connections and proxy timeouts
- **Full state on connect/reconnect** — ensures client is always in sync without complex delta logic

## Further Considerations (optional post-MVP)
1. **Message serialization format**: Use JSON (default) or consider MessagePack for bandwidth optimization if many concurrent sessions
2. **Auth/session validation**: Currently anyone with a session ID can connect; add token-based auth if needed
3. **Persistent session state**: Move from in-memory to Redis/DB if horizontal scaling is required
4. **Observability**: Add metrics for connected clients, messages/sec, reconnect rate
