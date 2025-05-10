import React from "react";
import Score from "./Score";
import { Team } from "../context/TeamContext";
import "../styles/ScoreContainer.css";

interface ScoreContainerProps {
  teams: Team[];
  loading: boolean;
  modifyTeam: (updatedTeam: Team, index: number) => void;
}

const ScoreContainer: React.FC<ScoreContainerProps> = ({
  teams,
  loading,
  modifyTeam,
}) => {
  return (
    <div className="score-container">
      {teams.map((team, index) => (
        <div
          key={index}
          className ={"wrapper"}
        >
          {loading ? (
            <div>Loading scores...</div>
          ) : (
              <Score
                team={team}
                modifyTeam={(updatedTeam) => modifyTeam(updatedTeam, index)}
              />
          )}
        </div>
      ))}
    </div>
  );
};
              
{/* <button onClick={() => buzzIn(index)}>Buzz</button> */}

export default ScoreContainer;