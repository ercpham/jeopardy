import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Question.css";

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
        <h2>{questionText}</h2>
        {revealed ? (
          <>
            <p className="answer">{answerText}</p>
            <p className="reference">{referenceText}</p>
          </>
        ) : (
          <button className="reveal-button" onClick={onRevealAnswer}>
            Reveal Answer
          </button>
        )}
      </div>
    </div>
  );
};

export default Question;
