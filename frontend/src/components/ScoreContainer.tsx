import React, { useRef, useEffect } from "react";
import Score from "./Score";
import { useAppStore } from "../store/useAppStore";
import { Team } from "../types/bindings/Team";
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
  const selectedTeam = useAppStore(state => state.selectedTeam);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle mouse wheel for horizontal scrolling
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (containerRef.current && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
      // Only handle vertical wheel events for horizontal scrolling
      containerRef.current.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

  // Track previous buzz states to detect changes
  const prevTeamsRef = useRef<Team[]>(teams);
  
  // Scroll to team when they buzz in
  useEffect(() => {
    // Check if any team's buzz_lock_owned changed from false to true
    let buzzingTeamIndex = -1;
    
    for (let i = 0; i < teams.length; i++) {
      const currTeam = teams[i];
      // Only compare if we have previous data for this index
      if (i < prevTeamsRef.current.length) {
        const prevTeam = prevTeamsRef.current[i];
        if (currTeam && prevTeam && 
            !prevTeam.buzz_lock_owned && currTeam.buzz_lock_owned) {
          buzzingTeamIndex = i;
          break;
        }
      }
    }
    
    if (buzzingTeamIndex !== -1 && containerRef.current) {
      const container = containerRef.current;
      const wrapperElements = container.querySelectorAll('.wrapper');
      
      if (wrapperElements.length > buzzingTeamIndex) {
        const targetWrapper = wrapperElements[buzzingTeamIndex] as HTMLElement;
        const containerWidth = container.clientWidth;
        const targetLeft = targetWrapper.offsetLeft;
        const targetWidth = targetWrapper.offsetWidth;
        
        // Calculate scroll position to center the team
        const scrollTo = targetLeft - (containerWidth / 2) + (targetWidth / 2);
        
        // Ensure we don't scroll beyond bounds
        const maxScroll = container.scrollWidth - containerWidth;
        const boundedScroll = Math.max(0, Math.min(scrollTo, maxScroll));
        
        container.scrollTo({
          left: boundedScroll,
          behavior: 'smooth'
        });
      }
    }
    
    // Update previous teams reference
    prevTeamsRef.current = teams;
  }, [teams]);

  return (
    <div 
      className={`score-container ${player ? "player" : ""}`}
      ref={containerRef}
      onWheel={handleWheel}
    >
      <div className="score-container-inner">
{player ? (
           teams[selectedTeam] ? (
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
             <div className="wrapper">
               <div className="loading-spinner"></div>
             </div>
           )
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
