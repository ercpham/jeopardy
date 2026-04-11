import React, { useEffect, useRef, useState } from "react";
import "../styles/BuzzerPage.css";
import { Team, useTeam } from "../context/TeamContext";
import BuzzFeedback from "../components/BuzzFeedback";

interface BuzzerPageProps {
  buzzIn: (teamIndex: number) => void;
  teams: Team[];
}

const BuzzerPage: React.FC<BuzzerPageProps> = ({ buzzIn, teams }) => {
  const {selectedTeam, setSelectedTeam, buzzLock, buzzFeedback } = useTeam();
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  const touchStartRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsPressed(true);
    touchStartRef.current = Date.now();
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsPressed(false);
    
    const touchDuration = Date.now() - touchStartRef.current;
    const touchY = e.changedTouches[0].clientY;
    const verticalMovement = Math.abs(touchY - touchStartYRef.current);
    
    // Only trigger buzz if it was a quick tap with minimal movement
    if (touchDuration < 200 && verticalMovement < 10) {
      buzzIn(selectedTeam);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // If user drags too far, cancel the press
    const currentY = e.touches[0].clientY;
    if (Math.abs(currentY - touchStartYRef.current) > 20) {
      setIsPressed(false);
    }
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
      <button 
        className={`buzzer-button ${buzzLock ? "lock_owned" : ""} ${teams[selectedTeam]?.buzz_lock_owned ? "lock_win" : ""} ${isPressed ? "pressed" : ""}`}
        onClick={handleBuzz}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchCancel={() => setIsPressed(false)}
      >
      </button>
      <BuzzFeedback 
        visible={buzzFeedback.visible}
        message={buzzFeedback.message}
      />
    </div>
  );
};

export default BuzzerPage;
