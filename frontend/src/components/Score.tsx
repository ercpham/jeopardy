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
import { Team } from "../context/TeamContext";
import "../styles/Score.css";

const Score: React.FC<{
  team: Team;
  modifyTeam: (updatedTeam: Team) => void;
}> = ({ team, modifyTeam }) => {
  const [inputValue, setInputValue] = useState<number>(0);

  const handleAdd = () => {
    modifyTeam({ ...team, score: team.score + inputValue });
  };

  const handleSubtract = () => {
    modifyTeam({ ...team, score: team.score - inputValue });
  };

  return (
    <div className={`scorecard ${team.buzz_lock_owned ? "active" : ""}`}>
      <h3>
        {team.team_name}
      </h3>
      <h1>{team.score}</h1>
      <div className="score-controls">
        <button onClick={handleAdd}>+</button>
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(Number(e.target.value))}
          className="score-input"
        />
        <button onClick={handleSubtract}>-</button>
      </div>
    </div>
  );
};

export default Score;
