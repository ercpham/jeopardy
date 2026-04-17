import React from "react";
import { useParams } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { lockBuzzers } from "../services/api";
import Question from "../components/Question";

/**
 * QuestionPage component displays a single question and its details.
 *
 * Features:
 * - Fetches the question details from the QuestionsContext using the question ID from the URL.
 * - Allows users to reveal the answer to the question.
 * - Displays a message if the question is not found.
 * - Passes buzzLock state into Question so the timer can pause when a team buzzes in.
 * - Locks buzzers (without crediting a team) when the timer reaches zero.
 */

const QuestionPage: React.FC = () => {
  const questions = useAppStore(state => state.questions);
  const revealAnswer = useAppStore(state => state.revealAnswer);
  const buzzLock = useAppStore(state => state.buzzLock);
  const { id } = useParams<{ id: string }>();
  const question = questions.find((q) => q.id === id);

  if (!question) {
    return <p>Question not found!</p>;
  }

  return (
    <Question
      questionText={question.questionText}
      answerText={question.answerText}
      referenceText={question.referenceText}
      revealed={question.revealed}
      buzzLock={buzzLock}
      onRevealAnswer={() => revealAnswer(question.id)}
      onTimerExpired={lockBuzzers}
    />
  );
};

export default QuestionPage;
