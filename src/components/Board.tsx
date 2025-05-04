import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBoard } from "../context/BoardContext";
import { Question } from "../context/QuestionsContext";
import "../styles/Board.css";

const Board: React.FC<{ questions: Question[]; triggerAnimation: boolean }> = ({
  questions,
  triggerAnimation,
}) => {
  const navigate = useNavigate();
  const { clickedCells, setClickedCells } = useBoard();
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

  const handleButtonClick = (id: string) => {
    if (!id.startsWith("blank")) {
      setClickedCells((prev) => {
        const newSet = new Set(prev);
        newSet.add(id);
        return newSet;
      });
      navigate(`/question/${id}`);
    }
  };

  return (
    <div className={`board`}>
      {normalizedQuestions.map((question, index) => {
        const pointValue = Math.floor(index / 5 + 1) * 100;
        const isClicked = clickedCells.has(question.id);

        return (
          <button
            key={question.id}
            className={`board-button ${isClicked ? "clicked" : ""} ${animate ? "animate" : ""}`}
            onClick={() => handleButtonClick(question.id)}
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
