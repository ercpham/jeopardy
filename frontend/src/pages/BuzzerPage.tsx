import React, { useState } from "react";
import "../styles/BuzzerPage.css";
import { Team } from "../context/TeamContext";

interface BuzzerPageProps {
  buzzIn: (teamIndex: number) => void;
  teams: Team[];
}

const BuzzerPage: React.FC<BuzzerPageProps> = ({ buzzIn, teams }) => {
  const [currentTeam, setCurrentTeam] = useState(0);

  const handleBuzz = () => {
    buzzIn(currentTeam);
  };

  const handleTeamChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentTeam(Number(event.target.value));
  };

  return (
    <div className="buzzer-page">
      <div className="team-selector">
        <label htmlFor="team-select">Select Team: </label>
        <select
          id="team-select"
          value={currentTeam}
          onChange={handleTeamChange}
        >
          {teams.map((team, index) => (
            <option key={index} value={index}>
              {team.team_name}
            </option>
          ))}
        </select>
      </div>
      <button className="buzzer-button" onClick={handleBuzz}>
        Buzz!
      </button>
    </div>
  );
};

export default BuzzerPage;
