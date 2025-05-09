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
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h2>
        {team.team_name} Score: {team.score}
      </h2>
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
