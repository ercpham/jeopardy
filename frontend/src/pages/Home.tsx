import React from "react";
import Board from "../components/Board";
import { useAppStore } from "../store/useAppStore";

/**
 * Home page component that displays the main board of questions.
 *
 * Props:
 * - `triggerAnimation`: A boolean to trigger animations on the board.
 * - `boardKey`: A unique key to force re-rendering of the board.
 *
 * Features:
 * - Fetches questions from the QuestionsContext.
 * - Renders the Board component with the provided questions and animation trigger.
 */

const Home: React.FC<{ triggerAnimation: boolean; boardKey: number }> = ({
  triggerAnimation,
  boardKey,
}) => {
  const questions = useAppStore(state => state.questions);

  return (
    <div>
      <Board
        key={boardKey}
        questions={questions}
        triggerAnimation={triggerAnimation}
      />
    </div>
  );
};

export default Home;
