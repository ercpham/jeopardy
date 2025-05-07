import React from "react";
import { useParams } from "react-router-dom";
import { useQuestions } from "../context/QuestionsContext";
import Question from "../components/Question";

/**
 * QuestionPage component displays a single question and its details.
 * 
 * Features:
 * - Fetches the question details from the QuestionsContext using the question ID from the URL.
 * - Allows users to reveal the answer to the question.
 * - Displays a message if the question is not found.
 */

const QuestionPage: React.FC = () => {
  const { questions, revealAnswer } = useQuestions();
  const { id } = useParams<{ id: string }>();
  const question = questions.find((q) => q.id === id);

  if (!question) {
    return <p>Question not found!</p>;
  }

  const handleRevealAnswer = () => {
    revealAnswer(question.id);
  };

  return (
    <Question
      questionText={question.questionText}
      answerText={question.answerText}
      referenceText={question.referenceText}
      revealed={question.revealed}
      onRevealAnswer={handleRevealAnswer}
    />
  );
};

export default QuestionPage;
