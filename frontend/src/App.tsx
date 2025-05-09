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
import Score from "./components/Score";
import { Team, useTeam } from "./context/TeamContext";
import { useQuestions } from "./context/QuestionsContext";
import { useBoard } from "./context/BoardContext";
import { useSession } from "./context/SessionContext";

const App: React.FC = () => {
  const { teams, modifyTeam, buzzIn, releaseBuzzLock, loading } = useTeam();
  const { resetQuestions, setQuestions } = useQuestions();
  const { resetClickedCells } = useBoard();
  const { sessionId, startSession, closeSession, joinSession } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [triggerAnimation, setTriggerAnimation] = useState(false);
  const [boardKey, setBoardKey] = useState(0);
  const [joinSessionId, setJoinSessionId] = useState("");

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleScores = () => {
    setShowScores((prev) => !prev);
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileInput = event.target;
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsedQuestions = text
        .split("\n")
        .slice(1)
        .filter((line) => line.trim() !== "")
        .map((line, index) => {
          const [questionText, answerText, referenceText] = line.split("\t");
          return {
            id: `${index + 1}`,
            questionText: questionText || "",
            answerText: answerText || "",
            referenceText: referenceText || "",
            revealed: false,
          };
        });
      setQuestions(parsedQuestions);
      handleResetBoardState();
    };
    reader.readAsText(file);

    fileInput.value = "";
  };

  const handleJoinSession = () => {
    if (joinSessionId.trim()) {
      joinSession(joinSessionId.trim());
      setJoinSessionId("");
    }
  };

  return (
    <>
      <div className={`menu ${menuOpen ? "open" : ""}`}>
        <ul>
          <li>
            <label htmlFor="file-upload" className="file-upload-label">
              Upload File
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".tsv"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
          </li>
          <li onClick={handleResetBoardState}>Reset Board State</li>
          <li onClick={toggleScores}>Toggle Scores</li>
          <li onClick={sessionId ? closeSession : startSession}>
            {sessionId ? "Close Session" : "Start Session"}
          </li>
          <li className="session-join-container">
            {!sessionId && (
              <div className="session-input-wrapper">
                <input
                  type="text"
                  placeholder="Enter Session ID"
                  value={joinSessionId}
                  onChange={(e) => setJoinSessionId(e.target.value)}
                />
                <button onClick={handleJoinSession}>Join Session</button>
              </div>
            )}
            {sessionId && (
              <div className="session-id">Session ID: {sessionId}</div>
            )}
          </li>
        </ul>
      </div>
      <div className={`routeContainer ${menuOpen ? "shifted" : ""}`}>
        <button
          className="hamburger-button"
          onClick={toggleMenu}
          aria-label="Open Menu"
        >
          ☰
        </button>
        <button
          onClick={releaseBuzzLock}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
          aria-label="Release Buzz Lock"
        >
          <span role="img" aria-label="Unlocked Padlock">🔓</span>
        </button>
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
          <div className="score-container">
            {teams.map((team, index) => (
              <div key={index} style={{ textAlign: "center", marginTop: "20px" }}>
                {loading ? (
                  <div>Loading scores...</div>
                ) : (
                  <div className={`score ${team.buzz_lock_owned ? 'buzz-lock-owned' : ''}`}>
                    <Score
                      team={team}
                      modifyTeam={(updatedTeam) => modifyTeam(updatedTeam, index)}
                    />
                    <button onClick={() => buzzIn(index)}>Buzz</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default App;
