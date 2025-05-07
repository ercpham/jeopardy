/**
 * Score component displays the scores for three teams.
 * 
 * Props:
 * - `team1`: The score for team 1.
 * - `team2`: The score for team 2.
 * - `team3`: The score for team 3.
 * 
 * Features:
 * - Displays the scores for each team in a styled container.
 */

import React, { useState } from "react";
import { useScore } from "../context/ScoreContext";

const Score: React.FC<{
  score: number;
  modifyScore: (newScore: number) => void;
}> = ({ score, modifyScore }) => {
  const { loading } = useScore();
  const [inputValue, setInputValue] = useState<number>(0);

  const handleAdd = () => {
    modifyScore(score + inputValue);
  };

  const handleSubtract = () => {
    modifyScore(score - inputValue);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        Loading scores...
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h2>Team Score: {score}</h2>
      <div>
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(Number(e.target.value))}
          style={{ marginRight: "10px" }}
        />
        <button onClick={handleAdd}>Add</button>
        <button onClick={handleSubtract} style={{ marginLeft: "10px" }}>
          Subtract
        </button>
      </div>
    </div>
  );
};

export default Score;
