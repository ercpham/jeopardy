import React, { useEffect, useRef } from "react";
import "../styles/BuzzerPage.css";
import { Team, useTeam } from "../context/TeamContext";

interface BuzzerPageProps {
  buzzIn: (teamIndex: number) => void;
  teams: Team[];
}

const BuzzerPage: React.FC<BuzzerPageProps> = ({ buzzIn, teams }) => {
  const {selectedTeam, setSelectedTeam, buzzLock } = useTeam();
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Wake lock request can fail (e.g. low battery), silently ignore
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, []);

  const handleBuzz = () => {
    buzzIn(selectedTeam);
  };

  const handleTeamChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTeam(Number(event.target.value));
  };

  return (
    <div className="buzzer-page">
      <div className="team-selector">
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
