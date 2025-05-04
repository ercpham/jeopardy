import React from "react";

interface ScoreboardProps {
  score: number;
  updateScore: (points: number) => void;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ score, updateScore }) => {
  return (
    <div className="scoreboard">
      <h2>Scoreboard</h2>
      <p>Current Score: {score}</p>
      <button onClick={() => updateScore(1)}>Add 1 Point</button>
      <button onClick={() => updateScore(-1)}>Subtract 1 Point</button>
    </div>
  );
};

export default Scoreboard;
