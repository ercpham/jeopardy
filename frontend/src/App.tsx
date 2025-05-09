/**
 * App component serves as the root of the application.
 *
 * Features:
 * - Wraps the application with context providers for session, score, and questions.
 * - Sets up routing for the Home and QuestionPage components.
 */

import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import QuestionPage from "./pages/QuestionPage";
import BuzzerPage from "./pages/BuzzerPage";
import ScoreContainer from "./components/ScoreContainer";
import { useTeam } from "./context/TeamContext";
import { useQuestions } from "./context/QuestionsContext";
import { useBoard } from "./context/BoardContext";
import { useSession } from "./context/SessionContext";
import Menu from "./components/Menu";

const App: React.FC = () => {
  const { teams, buzzLock, modifyTeam, buzzIn, releaseBuzzLock, loading } =
    useTeam();
  const { resetQuestions, setQuestions } = useQuestions();
  const { resetClickedCells } = useBoard();
  const { sessionId, startSession, closeSession, joinSession, setSessionId } =
    useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [triggerAnimation, setTriggerAnimation] = useState(false);
  const [boardKey, setBoardKey] = useState(0);
  const [player, setPlayer] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleScores = () => {
    setShowScores((prev) => !prev);
  };

  const handleJoinSession = (sessionId: string) => {
    setPlayer(true);
    joinSession(sessionId);
  };

  const handleLeaveSession = () => {
    setPlayer(false);
    setSessionId(null);
  };

  const resetTeams = () => {
    const defaultTeams = [
      { team_name: "Team 1", score: 0, buzz_lock_owned: false },
      { team_name: "Team 2", score: 0, buzz_lock_owned: false },
      { team_name: "Team 3", score: 0, buzz_lock_owned: false },
    ];
    defaultTeams.forEach((team, index) => {
      modifyTeam(team, index);
    });
  };

  const handleResetBoardState = () => {
    resetQuestions();
    resetClickedCells();
    resetTeams();
    setBoardKey((prevKey) => prevKey + 1);
    setTriggerAnimation(true);
    setTimeout(() => {
      setTriggerAnimation(false);
    }, 10);
  };

  return (
    <>
      <Menu
        sessionId={sessionId}
        menuOpen={menuOpen}
        startSession={startSession}
        closeSession={closeSession}
        joinSession={handleJoinSession}
        leaveSession={handleLeaveSession}
        toggleScores={toggleScores}
        setQuestions={setQuestions}
        handleResetBoardState={handleResetBoardState}
        player={player}
      />
      <div className={`routeContainer ${menuOpen ? "shifted" : ""}`}>
        <button
          className="hamburger-button"
          onClick={toggleMenu}
          aria-label="Open Menu"
        >
          ☰
        </button>
        {buzzLock && !player && (
          <button
            onClick={releaseBuzzLock}
            className={"lock-button"}
            aria-label="Release Buzz Lock"
          >
            <span role="img" aria-label="Unlocked Padlock">
              🔓
            </span>
          </button>
        )}
        {player ? (
          <BuzzerPage buzzIn={buzzIn} teams={teams} />
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <Home triggerAnimation={triggerAnimation} boardKey={boardKey} />
              }
            />
            <Route path="/question/:id" element={<QuestionPage />} />
          </Routes>
        )}
        {showScores && (
          <ScoreContainer
            teams={teams}
            loading={loading}
            modifyTeam={modifyTeam}
          />
        )}
      </div>
    </>
  );
};

export default App;
