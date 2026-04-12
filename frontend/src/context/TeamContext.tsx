import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useSession } from "./SessionContext";

/**
 * TeamContext provides state management for team information.
 *
 * Replaces HTTP polling with WebSocket push updates.
 * Sends actions (buzz, release, score, name) via WebSocket and
 * listens for server broadcasts to update React state.
 */
export interface Team {
  team_name: string;
  score: number;
  buzz_lock_owned: boolean;
  has_buzzed: boolean; // Track if team has buzzed for current question
  last_buzz_attempt: string | null;
}

interface BuzzFeedback {
  visible: boolean;
  message: string;
}

interface TeamContextProps {
  teams: Team[];
  buzzLock: boolean;
  modifyTeam: (team: Team, index: number) => void;
  releaseBuzzLock: () => void;
  lockBuzzers: () => void;
  buzzIn: (index: number) => void;
  hasPlayedBuzzerRef: React.RefObject<boolean>;
  selectedTeam: number;
  setSelectedTeam: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
  addTeam: () => void;
  removeTeam: (index: number) => void;
  resetBuzzedTeams: () => void; // Reset has_buzzed when new question starts
  buzzFeedback: BuzzFeedback;
}

const defaultTeams: Team[] = [
  { team_name: "Team 1", score: 0, buzz_lock_owned: false, has_buzzed: false, last_buzz_attempt: null },
  { team_name: "Team 2", score: 0, buzz_lock_owned: false, has_buzzed: false, last_buzz_attempt: null },
  { team_name: "Team 3", score: 0, buzz_lock_owned: false, has_buzzed: false, last_buzz_attempt: null },
];

const TeamContext = createContext<TeamContextProps | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [teams, setTeams] = useState<Team[]>(defaultTeams);
  const [buzzLock, setBuzzLock] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<number>(0);
  const selectedTeamRef = useRef<number>(selectedTeam);

  useEffect(() => {
    selectedTeamRef.current = selectedTeam;
  }, [selectedTeam]);
  const [buzzFeedback, setBuzzFeedback] = useState<BuzzFeedback>({
    visible: false,
    message: '',
  });
  const hasPlayedBuzzerRef = useRef(false);
  const lastBuzzAttemptRef = useRef<Map<number, number>>(new Map());


  const { sessionId, setSessionId, wsRef, setOnWsMessage, sessionState } = useSession();
  const currentPageRef = useRef("home");

  // Derive loading: true while waiting for initial session state from WS
  const loading = !!(sessionId && !sessionState);

  /**
   * Applies a full session state received from the server.
   */
  const applyFullState = useCallback((session: {
    teams: Team[];
    buzz_lock: boolean;
    dark_mode: boolean;
    timer_enabled: boolean;
    current_page?: string;
    created_at: string;
    last_modified: string;
  }) => {
    if (session.teams) {
      setTeams(session.teams);
    }
    if (typeof session.buzz_lock === "boolean") {
      setBuzzLock(session.buzz_lock);
      if (session.buzz_lock && !hasPlayedBuzzerRef.current) {
        const buzzerSound = new Audio("/sounds/buzz.mp3");
        buzzerSound.play().catch(() => {});
        hasPlayedBuzzerRef.current = true;
      }
      if (!session.buzz_lock) {
        hasPlayedBuzzerRef.current = false;
      }
    }
    if (session.current_page) {
      currentPageRef.current = session.current_page;
    }
}, []);

  const sendWsMessage = useCallback(
    (msg: object) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
        return true;
      }
      return false;
    },
    [wsRef]
  );

  const releaseBuzzLock = useCallback(() => {
    if (!sessionId) {
      setBuzzLock(false);
      setTeams((prev) =>
        prev.map((team) => ({ ...team, buzz_lock_owned: false, has_buzzed: false }))
      );
      return;
    }

    if (!sendWsMessage({ type: "ReleaseBuzz" })) {
      // Fallback to HTTP
      fetch(`${API_URL}/session/${sessionId}/buzz/release`, {
        method: "POST",
      }).catch(() => {});
    }
  }, [sessionId, sendWsMessage]);

  

  /**
   * Handles individual WebSocket messages from the server.
   * FullState is handled by SessionContext; we only handle incremental updates here.
   */
  const handleWsMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "BuzzLocked":
            setBuzzLock(true);
            setTeams((prev) =>
              prev.map((team, i) => ({
                ...team,
                buzz_lock_owned: i === msg.team_index,
                has_buzzed: i === msg.team_index || team.has_buzzed,
              }))
            );
            // 15-second timer will be handled by Question component if on question page
            if (!hasPlayedBuzzerRef.current) {
              const buzzerSound = new Audio("/sounds/buzz.mp3");
              buzzerSound.play().catch(() => {});
              hasPlayedBuzzerRef.current = true;
            }
            
            // Show timing feedback if another team got the buzz
            if (msg.team_index !== selectedTeamRef.current && msg.server_timestamp && msg.client_timestamp && msg.team_name) {
              try {
                const serverTime = new Date(msg.server_timestamp).getTime();
                const echoedClientTime = new Date(msg.client_timestamp).getTime();
                const originalClientTime = lastBuzzAttemptRef.current.get(selectedTeamRef.current);
                
                if (originalClientTime) {
                  // Calculate time difference with clock skew compensation
                  const roundTripTime = serverTime - originalClientTime;
                  const oneWayLatency = roundTripTime / 2;
                  const clockSkew = echoedClientTime - (originalClientTime + oneWayLatency);
                  const adjustedServerTime = serverTime - clockSkew;
                  const timeDiff = adjustedServerTime - originalClientTime;
                  
                  // Only show feedback if within reasonable range (0-2000ms)
                  if (timeDiff >= -100 && timeDiff <= 2100) {
                    const displayDiff = Math.max(0, Math.round(timeDiff));
                    let message = `${msg.team_name} buzzed in ${displayDiff} ms before you!`;
                    
                    if (displayDiff < 50) {
                      message = `${msg.team_name} buzzed just before you!`;
                    } else if (displayDiff > 1000) {
                      const seconds = (displayDiff / 1000).toFixed(1);
                      message = `${msg.team_name} buzzed ${seconds} seconds before you!`;
                    }
                    
                    setBuzzFeedback({
                      visible: true,
                      message,
                    });
                    
                    // Auto-hide after 3 seconds
                    setTimeout(() => {
                      setBuzzFeedback(prev => ({ ...prev, visible: false }));
                    }, 3000);
                  }
                }
              } catch (error) {
                // Ignore timestamp parsing errors - show no feedback
                console.error('Error parsing buzz timestamps:', error);
              }
            }
            
            // Clear the stored timestamp for this team
            lastBuzzAttemptRef.current.delete(selectedTeamRef.current);
            break;

          case "BuzzReleased":
            setBuzzLock(false);
            setTeams((prev) =>
              prev.map((team) => ({
                ...team,
                buzz_lock_owned: false,
                has_buzzed: currentPageRef.current === "home" ? false : team.has_buzzed,
              }))
            );
            hasPlayedBuzzerRef.current = false;
            break;

          case "ScoreUpdate":
            setTeams((prev) =>
              prev.map((team, i) =>
                i === msg.team_index ? { ...team, score: msg.score } : team
              )
            );
            break;

          case "TeamNameUpdate":
            setTeams((prev) =>
              prev.map((team, i) =>
                i === msg.team_index
                  ? { ...team, team_name: msg.name }
                  : team
              )
             );
             break;

           case "BuzzersLocked":
             setBuzzLock(true);
             // No team owns the lock — timer expiry
             setTeams((prev) => prev.map((team) => ({ ...team, buzz_lock_owned: false, has_buzzed: false })));
             break;

           case "HasBuzzedReset":
             setBuzzLock(false);
             currentPageRef.current = "home";
             setTeams((prev) => prev.map((team) => ({ ...team, buzz_lock_owned: false, has_buzzed: false })));
             break;

           case "PageUpdate":
             currentPageRef.current = msg.page;
             break;

           case "TeamAdded":
            setTeams((prev) => [...prev, msg.team]);
            break;
case "TeamRemoved":
             setTeams((prev) => {
               const newTeams = prev.filter((_, i) => i !== msg.team_index);
               return newTeams;
             });
             // Adjust selectedTeam if it's now out of bounds
             setSelectedTeam((currentSelected) => {
               if (currentSelected === msg.team_index) {
                 // If we removed the currently selected team, select the previous one if available
                 return Math.max(0, msg.team_index - 1);
               } else if (currentSelected > msg.team_index) {
                 // If we removed a team before the selected one, decrement the selected index
                 return currentSelected - 1;
               }
               return currentSelected;
             });
             break;
          case "SessionClosed":
            setSessionId(null);
            setTeams(defaultTeams);
            setBuzzLock(false);
            break;
        }
      } catch {
        // Ignore unparseable messages
      }
    },
    [setSessionId]
  );
  
  // Register WebSocket message handler when session is active
  useEffect(() => {
    if (sessionId) {
      setOnWsMessage(handleWsMessage);
    } else {
      setOnWsMessage(null);
      setTeams(defaultTeams);
      setBuzzLock(false);
    }

    return () => {
      setOnWsMessage(null);
    };
  }, [sessionId, handleWsMessage, setOnWsMessage]);

  // Sync initial state from SessionContext when sessionState arrives
  useEffect(() => {
    if (sessionState) {
      applyFullState(sessionState);
    } else if (!sessionId) {
      setTeams(defaultTeams);
      setBuzzLock(false);
    }
  }, [sessionState, sessionId, applyFullState]);

  /**
   * Reset has_buzzed for all teams (called when new question starts or going home)
   */
  const resetBuzzedTeams = () => {
    setTeams((prev) => prev.map((team) => ({ ...team, has_buzzed: false })));
  };

  /**
   * Buzz in for a team. Sends via WebSocket, falls back to HTTP if WS unavailable.
   */
  const buzzIn = (teamIndex: number) => {
    // Check if team has already buzzed for this question
    if (teams[teamIndex]?.has_buzzed) {
      return;
    }

    if (!sessionId && !buzzLock) {
      setBuzzLock(true);
      setTeams((prev) =>
        prev.map((team, index) =>
          index === teamIndex
            ? { ...team, buzz_lock_owned: true, has_buzzed: true }
            : { ...team, buzz_lock_owned: false, has_buzzed: team.has_buzzed }
        )
      );
      return;
    }

    if (buzzLock) return;

    // Record client timestamp for this buzz attempt
    const clientTimestamp = new Date().toISOString();
    lastBuzzAttemptRef.current.set(teamIndex, Date.now());

    // Try WebSocket first
    if (
      sendWsMessage({ 
        type: "BuzzIn", 
        team_index: teamIndex,
        client_timestamp: clientTimestamp 
      })
    ) {
      // Optimistic update - server will confirm
      setBuzzLock(true);
      setTeams((prev) =>
        prev.map((team, index) =>
          index === teamIndex
            ? { ...team, buzz_lock_owned: true, has_buzzed: true }
            : { ...team, buzz_lock_owned: false, has_buzzed: team.has_buzzed }
        )
      );
      return;
    }

    // Fallback to HTTP (HTTP won't get timing feedback)
    if (!sessionId) return;

    fetch(`${API_URL}/session/${sessionId}/buzz/${teamIndex}`, {
      method: "POST",
    })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (data === "Success") {
          setBuzzLock(true);
          setTeams((prev) =>
            prev.map((team, index) =>
              index === teamIndex
                ? { ...team, buzz_lock_owned: true, has_buzzed: true }
                : { ...team, buzz_lock_owned: false, has_buzzed: team.has_buzzed }
            )
          );
        }
      })
      .catch(() => {});
  };

   /**
    * Lock buzzers without crediting any team (used when timer expires).
    * Sends LockBuzzers over WebSocket so all clients lock in sync.
    */
   const lockBuzzers = () => {
     if (sessionId) {
       sendWsMessage({ type: "LockBuzzers" });
       // Server will broadcast BuzzersLocked back to all clients including us
       return;
     }
   };

/**
   * Modify a team's full info. Uses HTTP PUT (preserves existing behavior).
   * Server broadcasts the update to WebSocket clients.
   */
  const modifyTeam = (team: Team, index: number) => {
    if (!sessionId) {
      setTeams((prev) =>
        prev.map((t, i) => (i === index ? team : t))
      );
      return;
    }

    fetch(`${API_URL}/session/${sessionId}/teams/${index}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(team),
    })
      .then((response) => response.json())
      .then((data) => {
        // Optimistic update; server broadcast will confirm
        setTeams((prev) =>
          prev.map((t, i) => (i === index ? data : t))
        );
      })
      .catch(() => {});
  };

  /**
   * Add a new team. Sends via WebSocket.
   */
  const addTeam = () => {
    if (!sessionId) {
      const newTeamIndex = teams.length;
      const newTeam: Team = {
        team_name: `Team ${newTeamIndex + 1}`,
        score: 0,
        buzz_lock_owned: false,
        has_buzzed: false,
        last_buzz_attempt: null,
      };
      setTeams((prev) => [...prev, newTeam]);
      return;
    }

    sendWsMessage({ type: "AddTeam" });
  };

  /**
   * Remove a team. Sends via WebSocket.
   */
  const removeTeam = (teamIndex: number) => {
    if (!sessionId) {
      setTeams((prev) => prev.filter((_, i) => i !== teamIndex));
      // Adjust selectedTeam if it's now out of bounds
      setSelectedTeam((currentSelected) => {
        if (currentSelected === teamIndex) {
          // If we removed the currently selected team, select the previous one if available
          return Math.max(0, teamIndex - 1);
        } else if (currentSelected > teamIndex) {
          // If we removed a team before the selected one, decrement the selected index
          return currentSelected - 1;
        }
        return currentSelected;
      });
      return;
    }

    sendWsMessage({ type: "RemoveTeam", team_index: teamIndex });
  };

  return (
    <TeamContext.Provider
      value={{
        teams,
        buzzLock,
        modifyTeam,
        releaseBuzzLock,
        lockBuzzers,
        buzzIn,
        hasPlayedBuzzerRef,
        loading,
        selectedTeam,
        setSelectedTeam,
        addTeam,
        removeTeam,
        resetBuzzedTeams,
        buzzFeedback,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = (): TeamContextProps => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
};
