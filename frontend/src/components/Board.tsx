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
 * - Allows editing of category headers above the board.
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
  const [categories, setCategories] = useState(
    Array.from({ length: 6 }, (_, index) => `Category ${index + 1}`)
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (triggerAnimation) {
      setAnimate(true);
      const timeout = setTimeout(() => setAnimate(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [triggerAnimation]);

  useEffect(() => {
    if (questions.length > 0 && questions.every((q) => q.category)) {
      const newCategories = Array.from(
        new Set(questions.map((q) => q.category).filter((c): c is string => !!c))
      );
      if (newCategories.length === 6) {
        setCategories(newCategories);
      }
    }
  }, [questions]);

  const normalizedQuestions = Array.from({ length: 30 }, (_, index) => {
    return (
      questions[index] || {
        id: `blank-${index}`,
        questionText: "",
        answerText: "",
        referenceText: "",
        revealed: false,
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
      const pointValue =
        normalizedQuestions[index]?.pointValue ||
        Math.floor(index / 6 + 1) * 100;
      setTargetScore(pointValue); // Set the target score in context
      navigate(`/question/${id}`);
    }
  };

  const handleCategoryChange = (index: number, newValue: string) => {
    setCategories((prev) => {
      const updated = [...prev];
      updated[index] = newValue;
      return updated;
    });
  };

  const handleCategoryBlur = (index: number, value: string) => {
    setEditingIndex(null);
    handleCategoryChange(index, value);
  };

  return (
    <div className={`board-container`}>
      <div className={`board`}>
        {categories.map((category, index) => (
          <div key={index} className="category">
            {editingIndex === index ? (
              <input
                type="text"
                value={category}
                onChange={(e) => handleCategoryChange(index, e.target.value)}
                onBlur={(e) => handleCategoryBlur(index, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCategoryBlur(index, e.currentTarget.value);
                  }
                }}
                autoFocus
              />
            ) : (
              <h4 onClick={() => setEditingIndex(index)}>{category}</h4>
            )}
          </div>
        ))}
        {normalizedQuestions.map((question, index) => {
          const pointValue =
            question.pointValue || Math.floor(index / 6 + 1) * 100;
          const isClicked = clickedCells.has(question.id);
          const isRecentlyClicked = recentlyClickedIndex === index;

          return (
            <button
              key={question.id}
              className={`board-button ${isClicked ? "clicked" : ""} ${
                animate ? "animate" : ""
              } ${isRecentlyClicked ? "recentlyClicked" : ""}`}
              onClick={() => handleButtonClick(question.id, index)}
              disabled={question.id.startsWith("blank")}
              style={{
                animationDelay: `${index * 0.02}s`,
                zIndex: 30 - index,
              }} // Stagger animation
            >
              {question.id.startsWith("blank") ? "" : pointValue}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Board;
