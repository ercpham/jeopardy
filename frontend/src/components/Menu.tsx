import React, { useState } from "react";
import { useSession } from "../context/SessionContext";
import {
  Upload,
  RotateCcw,
  Eye,
  Users,
  Play,
  LogOut,
  Copy,
  BookOpen,
  X,
} from "lucide-react";
import "../styles/Menu.css";

interface MenuProps {
  sessionId: string | null;
  menuOpen: boolean;
  closeMenu: () => void;
  startSession: () => void;
  closeSession: () => void;
  joinSession: (sessionId: string) => void;
  leaveSession: () => void;
  toggleScores: () => void;
  setQuestions: (questions: {
    id: string;
    revealed: boolean;
    questionText: string;
    answerText: string;
    referenceText: string;
    category?: string;
    pointValue?: number;
  }[]) => void;
  handleResetBoardState: () => void;
  player: boolean;
  toggleManagingTeams: () => void;
  managingTeams: boolean;
}

const Menu: React.FC<MenuProps> = ({
  sessionId,
  menuOpen,
  closeMenu,
  startSession,
  closeSession,
  joinSession,
  leaveSession,
  toggleScores,
  setQuestions,
  handleResetBoardState,
  player,
  toggleManagingTeams,
  managingTeams,
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

      const parsedQuestions = questionLines.map((line, index) => {
        const values = line.split("\t");
        const question: {
          id: string;
          revealed: boolean;
          questionText: string;
          answerText: string;
          referenceText: string;
          category?: string;
          pointValue?: number;
        } = {
          id: `${index + 1}`,
          revealed: false,
          questionText: "",
          answerText: "",
          referenceText: "",
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
          const aPoint = a.pointValue || 0;
          const bPoint = b.pointValue || 0;
          if (aPoint !== bPoint) {
            return aPoint - bPoint;
          }
          const aCategory = a.category || "";
          const bCategory = b.category || "";
          return aCategory.localeCompare(bCategory);
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

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeMenu();
    }
  };

  return (
    <>
      {menuOpen && (
        <div className="menu-overlay" onClick={handleOverlayClick}>
          <div className="menu">
            <div className="menu-header">
              <BookOpen size={20} />
              <button
                className="menu-close"
                onClick={closeMenu}
                aria-label="Close Menu"
              >
                <X size={20} />
              </button>
            </div>
            <ul>
              {player ? (
                <li
                  onClick={() => {
                    leaveSession();
                  }}
                >
                  <LogOut size={18} /> Leave Session
                </li>
              ) : (
                <>
              <li>
                <label htmlFor="file-upload" className="file-upload-label">
                  <Upload size={18} /> Upload File
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".tsv"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </li>
              <li onClick={handleResetBoardState}>
                <RotateCcw size={18} /> Reset Board
              </li>
              <li onClick={toggleScores}>
                <Eye size={18} /> Toggle Scores
              </li>
              <li onClick={toggleManagingTeams}>
                <Users size={18} />{" "}
                {managingTeams ? "Exit Team Management" : "Add/Remove Teams"}
              </li>
              <li
                onClick={() => {
                  if (sessionId) {
                    closeSession();
                  } else {
                    startSession();
                  }
                }}
              >
                {sessionId ? (
                  <>
                    <LogOut size={18} /> Close Session
                  </>
                ) : (
                  <>
                    <Play size={18} /> Start Session
                  </>
                )}
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
                      <div
                        className="session-id"
                        onClick={handleCopySessionId}
                      >
                        <Copy size={14} /> Session ID: {sessionId}
                      </div>
                    </>
                  )}
                </div>
              </li>
              </>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default Menu;
