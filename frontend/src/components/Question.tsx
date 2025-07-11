import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Question.css";

/**
 * Question component displays a single question along with its answer and reference.
 * 
 * Props:
 * - `questionText`: The text of the question.
 * - `answerText`: The answer to the question.
 * - `referenceText`: The reference text for the question.
 * - `revealed`: A boolean indicating whether the answer is revealed.
 * - `onRevealAnswer`: A callback function to reveal the answer.
 * 
 * Features:
 * - Displays the question text.
 * - Reveals the answer and reference when the "Reveal Answer" button is clicked.
 */

const Question: React.FC<{
  questionText: string;
  answerText: string;
  referenceText: string;
  revealed: boolean;
  onRevealAnswer: () => void;
}> = ({
  questionText,
  answerText,
  referenceText,
  revealed,
  onRevealAnswer,
}) => {
  const navigate = useNavigate();

  /**
   * Handles navigation to the home page.
   */
  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="question-wrapper">
      <div className="question-container">
        <button
          className="home-button"
          onClick={handleGoHome}
          aria-label="Go to Home"
        >
          🏠
        </button>
        <div className="question-content">
          <h2 className="question-text">{questionText}</h2>
          {revealed ? (
            <>
              <h3 className="answer fade-in">{answerText}</h3>
              <h4 className="reference fade-in">{referenceText}</h4>
            </>
          ) : (
            <button className="reveal-button" onClick={onRevealAnswer}>
              Reveal Answer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Question;
