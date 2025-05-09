import React, { useState } from "react";
import "../styles/Menu.css";

interface MenuProps {
  sessionId: string | null;
  menuOpen: boolean;
  startSession: () => void;
  closeSession: () => void;
  joinSession: (sessionId: string) => void;
  toggleScores: () => void;
  setQuestions: (questions: any[]) => void;
  handleResetBoardState: () => void;
}

const Menu: React.FC<MenuProps> = ({
  sessionId,
  menuOpen,
  startSession,
  closeSession,
  joinSession,
  toggleScores,
  setQuestions,
  handleResetBoardState,
}) => {
  const [joinSessionId, setJoinSessionId] = useState("");

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
  );
};

export default Menu;