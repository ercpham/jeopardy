import React from "react";
import Board from "../components/Board";
import { useQuestions } from "../context/QuestionsContext";
import "../styles/Home.css";

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
