import React, { useState } from "react";
import { useSession } from "../context/SessionContext";
import "../styles/Menu.css";

interface MenuProps {
  sessionId: string | null;
  menuOpen: boolean;
  startSession: () => void;
  closeSession: () => void;
  joinSession: (sessionId: string) => void;
  leaveSession: () => void;
  toggleScores: () => void;
  setQuestions: (questions: any[]) => void;
  handleResetBoardState: () => void;
  player: boolean;
}

const Menu: React.FC<MenuProps> = ({
  sessionId,
  menuOpen,
  startSession,
  closeSession,
  joinSession,
  leaveSession,
  toggleScores,
  setQuestions,
  handleResetBoardState,
  player,
}) => {
  const [joinSessionId, setJoinSessionId] = useState("");
  const [copyMessageVisible, setCopyMessageVisible] = useState(false);
  const { sessionLoading } = useSession();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileInput = event.target;
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim() !== "");
      const headers = lines[0].split("\t").map((h) => h.trim());
      const questionLines = lines.slice(1);

      const hasCategory = headers.includes("Category");
      const hasPointValue = headers.includes("Point Value");

      let parsedQuestions = questionLines.map((line, index) => {
        const values = line.split("\t");
        const question: any = {
          id: `${index + 1}`,
          revealed: false,
        };

        headers.forEach((header, i) => {
          switch (header) {
            case "Question":
              question.questionText = values[i] || "";
              break;
            case "Answer":
              question.answerText = values[i] || "";
              break;
            case "Reference":
              question.referenceText = values[i] || "";
              break;
            case "Category":
              question.category = values[i] || "";
              break;
            case "Point Value":
              question.pointValue = parseInt(values[i], 10) || 0;
              break;
          }
        });

        return question;
      });

      if (hasCategory && hasPointValue) {
        parsedQuestions.sort((a, b) => {
          if (a.pointValue !== b.pointValue) {
            return a.pointValue - b.pointValue;
          }
          return a.category.localeCompare(b.category);
        });
      }

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

  const handleCopySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId);
      setCopyMessageVisible(true);
      setTimeout(() => setCopyMessageVisible(false), 1000);
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
        <li onClick={handleResetBoardState}>Reset Board</li>
        <li onClick={toggleScores}>Toggle Scores</li>
        <li
          onClick={() => {
            if (sessionId && player) {
              leaveSession(); // Leave session if sessionId and player are true
            } else if (sessionId) {
              closeSession(); // Close session if only sessionId is true
            } else {
              startSession(); // Start session if sessionId is false
            }
          }}
        >
          {sessionId && player
            ? "Leave Session"
            : sessionId
              ? "Close Session"
              : "Start Session"}
        </li>
        <li className="session-join-wrapper">
          {copyMessageVisible && (
            <h5 className="copy-message">Copied to clipboard!</h5>
          )}
          <div className="session-join-container">
            {!sessionId && !sessionLoading && (
              <div className="session-input-wrapper">
                <input
                  type="text"
                  placeholder="Enter Session ID"
                  value={joinSessionId}
                  onChange={(e) => {
                    const input = e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z]/g, "");
                    setJoinSessionId(input);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleJoinSession();
                    }
                  }}
                />
                <button onClick={handleJoinSession}>Join Session</button>
              </div>
            )}
            {!sessionId && sessionLoading && (
              <div className="loading-spinner"></div>
            )}
            {sessionId && (
              <>
                <div className="session-id" onClick={handleCopySessionId}>
                  Session ID: {sessionId}
                </div>
              </>
            )}
          </div>
        </li>
      </ul>
    </div>
  );
};

export default Menu;
