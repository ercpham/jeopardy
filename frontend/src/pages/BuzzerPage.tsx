import React from "react";
import "../styles/BuzzerPage.css";
import { Team, useTeam } from "../context/TeamContext";

interface BuzzerPageProps {
  buzzIn: (teamIndex: number) => void;
  teams: Team[];
}

const BuzzerPage: React.FC<BuzzerPageProps> = ({ buzzIn, teams }) => {
  const {selectedTeam, setSelectedTeam, buzzLock } = useTeam();

  const handleBuzz = () => {
    buzzIn(selectedTeam);
  };

  const handleTeamChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTeam(Number(event.target.value));
  };

  return (
    <div className="buzzer-page">
      <div className="team-selector">
        <label htmlFor="team-select">Select Team: </label>
        <select
          id="team-select"
          value={selectedTeam}
          onChange={handleTeamChange}
        >
          {teams.map((team, index) => (
            <option key={index} value={index}>
              {team.team_name}
            </option>
          ))}
        </select>
      </div>
      <button className={`buzzer-button ${buzzLock ? "lock_owned" : ""} ${teams[selectedTeam].buzz_lock_owned ? "lock_win" : ""}`} onClick={handleBuzz}>
      </button>
    </div>
  );
};

export default BuzzerPage;
