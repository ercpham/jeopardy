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
 * - Allows editing the team name by clicking on it.
 */

import React, { useState, useEffect } from "react";
import { Team } from "../context/TeamContext";
import { useBoard } from "../context/BoardContext";
import "../styles/Score.css";

const Score: React.FC<{
  team: Team;
  modifyTeam: (updatedTeam: Team) => void;
}> = ({ team, modifyTeam }) => {
  const [inputValue, setInputValue] = useState<number>(0);
  const { targetScore } = useBoard(); // Access targetScore from context
  const [isEditingName, setIsEditingName] = useState(false); // Track if editing team name
  const [teamName, setTeamName] = useState(team.team_name); // Local state for team name

  // Update inputValue only when targetScore changes
  useEffect(() => {
    if (targetScore !== null) {
      setInputValue(targetScore);
    }
  }, [targetScore]);

  const handleAdd = () => {
    modifyTeam({ ...team, score: team.score + inputValue });
  };

  const handleSubtract = () => {
    modifyTeam({ ...team, score: team.score - inputValue });
  };

  const handleNameChange = (newName: string) => {
    modifyTeam({ ...team, team_name: newName }); // Call modifyTeam with updated name
    setTeamName(newName); // Update local state
    setIsEditingName(false); // Exit editing mode
  };

  const handleBlurOrEnter = (e: React.KeyboardEvent | React.FocusEvent) => {
    if (e.type === "blur" || (e as React.KeyboardEvent).key === "Enter") {
      handleNameChange(teamName.toString());
    }
  };

  return (
    <div className={`scorecard ${team.buzz_lock_owned ? "active" : ""}`}>
      {isEditingName ? (
        <input
          className={"team-name-input"}
          type="text"
          value={teamName.toString()}
          onChange={(e) => setTeamName(e.target.value)}
          onBlur={handleBlurOrEnter}
          onKeyDown={handleBlurOrEnter}
          autoFocus
        />
      ) : (
        <h4 onClick={() => setIsEditingName(true)}>{teamName}</h4>
      )}
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
