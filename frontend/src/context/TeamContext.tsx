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
}

const defaultTeams: Team[] = [
  { team_name: "Team 1", score: 0, buzz_lock_owned: false },
  { team_name: "Team 2", score: 0, buzz_lock_owned: false },
  { team_name: "Team 3", score: 0, buzz_lock_owned: false },
];

const TeamContext = createContext<TeamContextProps | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [teams, setTeams] = useState<Team[]>(defaultTeams);
  const [buzzLock, setBuzzLock] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<number>(0);
  const hasPlayedBuzzerRef = useRef(false);

  const { sessionId, setSessionId, wsRef, setOnWsMessage, sessionState } =
    useSession();

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
  }, []);

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
              }))
            );
            if (!hasPlayedBuzzerRef.current) {
              const buzzerSound = new Audio("/sounds/buzz.mp3");
              buzzerSound.play().catch(() => {});
              hasPlayedBuzzerRef.current = true;
            }
            break;

          case "BuzzReleased":
            setBuzzLock(false);
            setTeams((prev) =>
              prev.map((team) => ({ ...team, buzz_lock_owned: false }))
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
             setTeams((prev) => prev.map((team) => ({ ...team, buzz_lock_owned: false })));
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

  /**
   * Sends a WebSocket message if connected, otherwise falls back to HTTP.
   */
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

  /**
   * Buzz in for a team. Sends via WebSocket, falls back to HTTP if WS unavailable.
   */
  const buzzIn = (teamIndex: number) => {
    if (!sessionId && !buzzLock) {
      setBuzzLock(true);
      setTeams((prev) =>
        prev.map((team, index) =>
          index === teamIndex
            ? { ...team, buzz_lock_owned: true }
            : { ...team, buzz_lock_owned: false }
        )
      );
      return;
    }

    if (buzzLock) return;

    // Try WebSocket first
    if (
      sendWsMessage({ type: "BuzzIn", team_index: teamIndex })
    ) {
      return;
    }

    // Fallback to HTTP
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
                ? { ...team, buzz_lock_owned: true }
                : { ...team, buzz_lock_owned: false }
            )
          );
        }
      })
      .catch(() => {});
  };

  /**
   * Release the buzz lock. Sends via WebSocket, falls back to HTTP.
   */
  const releaseBuzzLock = () => {
    if (!sessionId) {
      setBuzzLock(false);
      setTeams((prev) =>
        prev.map((team) => ({ ...team, buzz_lock_owned: false }))
      );
      return;
    }

    if (!sendWsMessage({ type: "ReleaseBuzz" })) {
      // Fallback to HTTP
      fetch(`${API_URL}/session/${sessionId}/buzz/release`, {
        method: "POST",
      }).catch(() => {});
    }
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
     // Solo mode: update local state directly
     setBuzzLock(true);
     setTeams((prev) => prev.map((team) => ({ ...team, buzz_lock_owned: false })));
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
