import React from "react";
import Score from "./Score";
import { Team, useTeam } from "../context/TeamContext";
import "../styles/ScoreContainer.css";

interface ScoreContainerProps {
  teams: Team[];
  loading: boolean;
  player: boolean;
  modifyTeam: (updatedTeam: Team, index: number) => void;
  managingTeams: boolean;
  addTeam: () => void;
  removeTeam: (index: number) => void;
}

const ScoreContainer: React.FC<ScoreContainerProps> = ({
  teams,
  loading,
  player,
  modifyTeam,
  managingTeams,
  addTeam,
  removeTeam,
}) => {
  const { selectedTeam } = useTeam();
  return (
    <div className={`score-container ${player ? "player" : ""}`}>
      <div className="score-container-inner">
        {player ? (
          <div key={selectedTeam} className="wrapper">
            <Score
              key={selectedTeam} // Use selectedTeam as the key to force rerender
              team={teams[selectedTeam]}
              controls={!player}
              modifyTeam={(updatedTeam) => modifyTeam(updatedTeam, selectedTeam)}
              managingTeams={managingTeams}
              removeTeam={() => removeTeam(selectedTeam)}
            />
          </div>
        ) : (
          <>
            {teams.map((team, index) => (
              <div key={index} className="wrapper">
                {loading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <Score
                    key={index} 
                    team={team}
                    controls={!player}
                    modifyTeam={(updatedTeam) => modifyTeam(updatedTeam, index)}
                    managingTeams={managingTeams}
                    removeTeam={() => removeTeam(index)}
                  />
                )}
              </div>
            ))}
            {managingTeams && !player && (
              <div className="add-team-wrapper">
                <button className="add-team-button" onClick={addTeam} aria-label="Add Team">
                  +
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ScoreContainer;
