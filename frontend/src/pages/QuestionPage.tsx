import React from "react";
import { useParams } from "react-router-dom";
import { useQuestions } from "../context/QuestionsContext";
import Question from "../components/Question";

const QuestionPage: React.FC = () => {
  const { questions, revealAnswer } = useQuestions();
  const { id } = useParams<{ id: string }>();
  const question = questions.find((q) => q.id === id);

  if (!question) {
    return <p>Question not found!</p>;
  }

  const handleRevealAnswer = () => {
    revealAnswer(question.id); // Mark the question as revealed
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
