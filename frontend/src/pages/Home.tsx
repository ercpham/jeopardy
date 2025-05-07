import React from "react";
import Board from "../components/Board";
import { useQuestions } from "../context/QuestionsContext";
import "../styles/Home.css";

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

const Home: React.FC<{ triggerAnimation: boolean; boardKey: number }> = ({ triggerAnimation, boardKey }) => {
  const { questions } = useQuestions();

  return (
    <div>
      <div className={`home`}>
        <Board
          key={boardKey}
          questions={questions}
          triggerAnimation={triggerAnimation}
        />
      </div>
    </div>
  );
};

export default Home;
