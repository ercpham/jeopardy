/**
 * App component serves as the root of the application.
 *
 * Features:
 * - Wraps the application with context providers for session, score, and questions.
 * - Sets up routing for the Home and QuestionPage components.
 */

import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Unlock, BookOpen } from "lucide-react";
import Home from "./pages/Home";
import QuestionPage from "./pages/QuestionPage";
import BuzzerPage from "./pages/BuzzerPage";
import ScoreContainer from "./components/ScoreContainer";
import ConnectionIndicator from "./components/ConnectionIndicator";
import Menu from "./components/Menu";
import Settings from "./components/Settings";
import { useAppStore } from "./store/useAppStore";
import { 
  startSession, 
  joinSession, 
  closeSession, 
  modifyTeam, 
  buzzIn, 
  releaseBuzzLock, 
  addTeam, 
  removeTeam 
} from "./services/api";
import { wsService } from "./services/WebSocketService";

const App: React.FC = () => {
  const teams = useAppStore(state => state.teams);
  const buzzLock = useAppStore(state => state.buzzLock);
  const resetQuestions = useAppStore(state => state.resetQuestions);
  const setQuestions = useAppStore(state => state.setQuestions);
  const resetClickedCells = useAppStore(state => state.resetClickedCells);
  const setRecentlyClickedIndex = useAppStore(state => state.setRecentlyClickedIndex);
  const sessionId = useAppStore(state => state.sessionId);
  const sessionLoading = useAppStore(state => state.sessionLoading);
  const setCurrentPage = useAppStore(state => state.setCurrentPage);

  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [triggerAnimation, setTriggerAnimation] = useState(false);
  const [boardKey, setBoardKey] = useState(0);
  const [player, setPlayer] = useState(false);
  const [managingTeams, setManagingTeams] = useState(false);
  const [mobileSessionId, setMobileSessionId] = useState("");
  const [mobileSessionError, setMobileSessionError] = useState("");

  useEffect(() => {
    const onHome = !player && location.pathname === "/";
    setCurrentPage(onHome ? "home" : "question");
    
    if (sessionId && wsService.send({ type: "SetPage", page: onHome ? "home" : "question" })) {
      // Sent successfully
    }
  }, [player, location.pathname, setCurrentPage, sessionId]);

  useEffect(() => {
    if (sessionId === null) {
      setPlayer(false);
    }
  }, [sessionId]);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const toggleScores = () => setShowScores((prev) => !prev);
  const toggleManagingTeams = () => setManagingTeams((prev) => !prev);

  const handleJoinSession = async (sid: string) => {
    const success = await joinSession(sid);
    if (success) {
      setPlayer(true);
      // Wait to play buzzer sound since they just joined
      useAppStore.getState().setHasPlayedBuzzer(true);
    } else {
      setMobileSessionError("Invalid session code. Please try again.");
    }
    return success;
  };

  const handleLeaveSession = () => {
    setPlayer(false);
    useAppStore.getState().setHasPlayedBuzzer(false);
    closeSession();
    setMobileSessionId("");
  };

  const handleMobileJoin = async () => {
    setMobileSessionError("");
    if (mobileSessionId.trim()) {
      await handleJoinSession(mobileSessionId.trim());
    }
  };

  const handleStartSession = () => {
    setShowScores(true);
    startSession();
  }

  const resetTeams = () => {
    const defaultTeamsConfig = [
      { team_name: "Team 1", score: 0, buzz_lock_owned: false, has_buzzed: false, last_buzz_attempt: null },
      { team_name: "Team 2", score: 0, buzz_lock_owned: false, has_buzzed: false, last_buzz_attempt: null },
      { team_name: "Team 3", score: 0, buzz_lock_owned: false, has_buzzed: false, last_buzz_attempt: null },
    ];
    defaultTeamsConfig.forEach((team, index) => {
      modifyTeam(team, index);
    });
  };

  const handleResetBoardState = () => {
    resetQuestions();
    resetClickedCells();
    resetTeams();
    setRecentlyClickedIndex(null);
    setBoardKey((prevKey) => prevKey + 1);
    setTriggerAnimation(true);
    releaseBuzzLock();
    setTimeout(() => {
      setTriggerAnimation(false);
    }, 10);
  };

  return (
    <>
       <Menu
        sessionId={sessionId}
        menuOpen={menuOpen}
        closeMenu={() => setMenuOpen(false)}
        startSession={handleStartSession}
        closeSession={closeSession}
        joinSession={handleJoinSession}
        leaveSession={handleLeaveSession}
        toggleScores={toggleScores}
        setQuestions={setQuestions}
        handleResetBoardState={handleResetBoardState}
        player={player}
        toggleManagingTeams={toggleManagingTeams}
        managingTeams={managingTeams}
      />
       <div className={`routeContainer ${player ? "player-active" : ""}`}>
         <button
           className="hamburger-button"
           onClick={toggleMenu}
           aria-label="Open Menu"
         >
           ☰
         </button>
        {!player && <Settings />}
        {buzzLock && !player && (
          <button
            onClick={releaseBuzzLock}
            className="lock-button"
            aria-label="Release Buzz Lock"
          >
            <Unlock size={20} />
          </button>
        )}
        <ConnectionIndicator />
        {player && (
          <BuzzerPage buzzIn={buzzIn} teams={teams} />
        )}
        <div className={`mobile-landing ${player ? "hidden" : ""}`}>
          <BookOpen size={40} />
          <h2>Bible Challenge</h2>
          <p className="mobile-landing-subtitle">Enter a session code to join the game</p>
          {sessionLoading ? (
            <div className="loading-spinner"></div>
          ) : (
            <div className="mobile-landing-form">
              <input
                type="text"
                placeholder="Session Code"
                value={mobileSessionId}
                onChange={(e) => {
                  const input = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                  setMobileSessionId(input);
                  setMobileSessionError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleMobileJoin();
                }}
                maxLength={4}
              />
              <button onClick={handleMobileJoin}>Join Session</button>
              {mobileSessionError && (
                <div className="mobile-session-error">{mobileSessionError}</div>
              )}
            </div>
          )}
        </div>
        <div className="desktop-content">
        <Routes>
            <Route
              path="/"
              element={
                <Home triggerAnimation={triggerAnimation} boardKey={boardKey} />
              }
            />
            <Route path="/question/:id" element={<QuestionPage />} />
          </Routes>
        {showScores && (
          <ScoreContainer
            teams={teams}
            loading={sessionLoading}
            player={player}
            modifyTeam={modifyTeam}
            managingTeams={managingTeams}
            addTeam={addTeam}
            removeTeam={removeTeam}
          />
        )}
        </div>
      </div>
    </>
  );
};

export default App;
