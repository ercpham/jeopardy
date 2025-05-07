import React from "react";

/**
 * Scoreboard component displays the scores for all teams in a leaderboard format.
 * 
 * Props:
 * - `score`: The current score value.
 * - `updateScore`: A function to update the score by adding or subtracting points.
 * 
 * Features:
 * - Displays the current score.
 * - Provides buttons to add or subtract points from the score.
 */

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
