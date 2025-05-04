import React, { useState } from "react";
import Board from "../components/Board";
import { useQuestions } from "../context/QuestionsContext";
import { useBoard } from "../context/BoardContext";
import "../styles/Home.css";

const Home: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [triggerAnimation, setTriggerAnimation] = useState(false);
  const [boardKey, setBoardKey] = useState(0); // Add a key state for the Board
  const { questions, setQuestions, resetQuestions } = useQuestions();
  const { resetClickedCells } = useBoard();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
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
        </ul>
      </div>
      <div className={`home ${menuOpen ? "shifted" : ""}`}>
        <button
          className="hamburger-button"
          onClick={toggleMenu}
          aria-label="Open Menu"
        >
          ☰
        </button>
        {/* Pass the boardKey as the key prop */}
        <Board
          key={boardKey}
          questions={questions}
          triggerAnimation={triggerAnimation}
        />
      </div>
    </div>
  );
};

export default Home;
