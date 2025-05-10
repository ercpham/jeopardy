import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBoard } from "../context/BoardContext";
import { Question } from "../context/QuestionsContext";
import "../styles/Board.css";

/**
 * Board component renders a 5x5 grid of buttons representing questions.
 * 
 * Props:
 * - `questions`: An array of Question objects to populate the board.
 * - `triggerAnimation`: A boolean to trigger animations on the board.
 * 
 * Features:
 * - Displays point values for each question.
 * - Tracks clicked cells using the BoardContext.
 * - Navigates to the question page when a button is clicked.
 * - Handles animations for button clicks.
 * - Highlights the most recently clicked button.
 */
const Board: React.FC<{ questions: Question[]; triggerAnimation: boolean }> = ({
  questions,
  triggerAnimation,
}) => {
  const navigate = useNavigate();
  const {
    clickedCells,
    setClickedCells,
    recentlyClickedIndex,
    setRecentlyClickedIndex,
    setTargetScore,
  } = useBoard();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (triggerAnimation) {
      setAnimate(true);
      const timeout = setTimeout(() => setAnimate(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [triggerAnimation]);

  const normalizedQuestions = Array.from({ length: 25 }, (_, index) => {
    return (
      questions[index] || {
        id: `blank-${index}`,
        questionText: "",
        answerText: "",
        referenceText: "",
      }
    );
  });

  /**
   * Handles the button click event for a specific question.
   * 
   * Parameters:
   * - `id`: The ID of the question to navigate to.
   * - `index`: The index of the button clicked.
   */
  const handleButtonClick = (id: string, index: number) => {
    if (!id.startsWith("blank")) {
      setClickedCells((prev) => {
        const newSet = new Set(prev);
        newSet.add(id);
        return newSet;
      });
      setRecentlyClickedIndex(index); // Update the recently clicked index
      const pointValue = Math.floor(index / 5 + 1) * 100;
      setTargetScore(pointValue); // Set the target score in context
      navigate(`/question/${id}`);
    }
  };

  return (
    <div className={`board`}>
      {normalizedQuestions.map((question, index) => {
        const pointValue = Math.floor(index / 5 + 1) * 100;
        const isClicked = clickedCells.has(question.id);
        const isRecentlyClicked = recentlyClickedIndex === index;

        return (
          <button
            key={question.id}
            className={`board-button ${isClicked ? "clicked" : ""} ${animate ? "animate" : ""} ${isRecentlyClicked ? "recentlyClicked" : ""}`}
            onClick={() => handleButtonClick(question.id, index)}
            disabled={question.id.startsWith("blank")}
            style={{ animationDelay: `${index * 0.02}s`, zIndex: 25 - index }} // Stagger animation
          >
            {question.id.startsWith("blank") ? "" : pointValue}
          </button>
        );
      })}
    </div>
  );
};

export default Board;
