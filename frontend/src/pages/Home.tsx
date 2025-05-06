import React, { useState, useEffect } from "react";
import Board from "../components/Board";
import Score from "../components/Score";
import { useQuestions } from "../context/QuestionsContext";
import { useBoard } from "../context/BoardContext";
import { useScore } from "../context/ScoreContext";
import "../styles/Home.css";

const Home: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [triggerAnimation, setTriggerAnimation] = useState(false);
  const [boardKey, setBoardKey] = useState(0); // Add a key state for the Board
  const [showScores, setShowScores] = useState(false);
  const { questions, setQuestions, resetQuestions } = useQuestions();
  const { resetClickedCells } = useBoard();
  const { scores, modifyScores } = useScore();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleScores = () => {
    setShowScores((prev) => !prev);
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

  const handleResetBoardState = () => {
    resetQuestions();
    resetClickedCells();
    modifyScores({ team1: 0, team2: 0, team3: 0 });
    setBoardKey((prevKey) => prevKey + 1);
    setTriggerAnimation(true);
    setTimeout(() => {
      setTriggerAnimation(false);
    }, 10);
  };

  return (
    <div>
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
        </ul>
      </div>
      <div className={`homeContainer ${menuOpen ? "shifted" : ""}`}>
        <button
          className="hamburger-button"
          onClick={toggleMenu}
          aria-label="Open Menu"
        >
          ☰
        </button>
        <div className={`home`}>
          <Board
            key={boardKey}
            questions={questions}
            triggerAnimation={triggerAnimation}
          />
          {showScores && (
            <div className="score-container">
              <Score
                score={scores.team1}
                modifyScore={(newScore: number) =>
                  modifyScores({
                    team1: newScore,
                    team2: scores.team2,
                    team3: scores.team3,
                  })
                }
              />
              <Score
                score={scores.team2}
                modifyScore={(newScore: number) =>
                  modifyScores({
                    team1: scores.team1,
                    team2: newScore,
                    team3: scores.team3,
                  })
                }
              />
              <Score
                score={scores.team3}
                modifyScore={(newScore: number) =>
                  modifyScores({
                    team1: scores.team1,
                    team2: scores.team2,
                    team3: newScore,
                  })
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
