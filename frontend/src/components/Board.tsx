import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { Question } from "../types/Question";
import { computeBoardGrid } from "../utils/grid";
import "../styles/Board.css";

/**
 * Board component renders a dynamic grid of buttons representing questions.
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
 * - Dynamically adjusts columns based on number of categories.
 */
const Board: React.FC<{ questions: Question[]; triggerAnimation: boolean }> = ({
  questions,
  triggerAnimation,
}) => {
  const navigate = useNavigate();
  const clickedCells = useAppStore(state => state.clickedCells);
  const setClickedCells = useAppStore(state => state.setClickedCells);
  const recentlyClickedIndex = useAppStore(state => state.recentlyClickedIndex);
  const setRecentlyClickedIndex = useAppStore(state => state.setRecentlyClickedIndex);
  const setTargetScore = useAppStore(state => state.setTargetScore);
  const editableCategories = useAppStore(state => state.editableCategories);
  const setEditableCategories = useAppStore(state => state.setEditableCategories);
  const sourceCategoriesKey = useAppStore(state => state.sourceCategoriesKey);
  const setSourceCategoriesKey = useAppStore(state => state.setSourceCategoriesKey);
  const [animate, setAnimate] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const { numColumns, numRows, computedCategories, normalizedQuestions } = useMemo(() => {
    return computeBoardGrid(questions);
  }, [questions]);

  // Seed editableCategories from computed data only when the source data has actually
  // changed (new file loaded). We track a fingerprint of the last-seeded source categories
  // in context so the comparison survives navigation / remounts.
  const computedCategoriesKey = computedCategories.join("||");
  useEffect(() => {
    if (computedCategoriesKey !== sourceCategoriesKey) {
      setEditableCategories(computedCategories);
      setSourceCategoriesKey(computedCategoriesKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedCategoriesKey]);

  useEffect(() => {
    if (triggerAnimation) {
      setAnimate(true);
      const timeout = setTimeout(() => setAnimate(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [triggerAnimation]);

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
      setRecentlyClickedIndex(index);
      const pointValue =
        normalizedQuestions[index]?.pointValue ||
        Math.floor(index / numColumns + 1) * 100;
      setTargetScore(pointValue);
      navigate(`/question/${id}`);
    }
  };

  const handleCategoryChange = (index: number, newValue: string) => {
    setEditableCategories((prev) => {
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
      <div
        className={`board`}
        style={{
          "--num-columns": numColumns,
          "--num-rows": numRows,
          gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
          gridTemplateRows: `3rem repeat(${numRows}, 1fr)`,
        } as React.CSSProperties}
      >
        {(editableCategories.length > 0 ? editableCategories : computedCategories).map((category, index) => (
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
            question.pointValue || Math.floor(index / numColumns + 1) * 100;
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
              }}
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
