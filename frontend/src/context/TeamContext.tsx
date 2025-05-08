import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "./SessionContext";

/**
 * TeamContext provides state management for team information in the application.
 *
 * This context is used to manage the scores and names of teams, modify scores, and handle loading states.
 */
export interface Team {
  team_name: String;
  score: number;
  buzz_lock_owned: boolean;
}

interface TeamContextProps {
  teams: Team[];
  modifyTeam: (team: Team, index: number) => void;
  loading: boolean;
}

const defaultTeams: Team[] = [
  { team_name: "Team 1", score: 0, buzz_lock_owned: false },
  { team_name: "Team 2", score: 0, buzz_lock_owned: false },
  { team_name: "Team 3", score: 0, buzz_lock_owned: false },
];

const TeamContext = createContext<TeamContextProps | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

/**
 * ScoreProvider component wraps its children with the TeamContext.
 *
 * Props:
 * - `children`: The child components that will have access to the TeamContext.
 */
export const ScoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [teams, setTeams] = useState<Team[]>(defaultTeams);
  const [_buzzLock, setBuzzLock] = useState(false);
  const [loading, setLoading] = useState(true);
  const { sessionId, setSessionId } = useSession();

  useEffect(() => {
    if (!sessionId) {
      setTeams(defaultTeams);
      setBuzzLock(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetchTeams = () => {
      fetch(`${API_URL}/session/${sessionId}/teams`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          setTeams(data || defaultTeams);
          setLoading(false);
        })
        .catch(() => {
          setSessionId(null);
          setTeams(defaultTeams);
          setLoading(false);
          clearInterval(intervalId);
        });
    };

    fetchTeams();
    const intervalId = setInterval(fetchTeams, 5000);

    return () => clearInterval(intervalId);
  }, [sessionId]);

  /**
   * Modifies team info for the current session.
   *
   * Parameters:
   * - `amounts`: The new team info to be applied.
   * - `index`: The index of the team to be modified.
   */
  const modifyTeam = (team: Team, index: number) => {
    if (!sessionId) {
      setTeams((prevTeams) =>
        prevTeams.map((t, i) => (i === index ? team : t))
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
        setTeams((prevTeams) =>
          prevTeams.map((t, i) => (i === index ? data : t))
        );

        fetch(`${API_URL}/session/${sessionId}/scores`)
          .then((response) => response.json())
          .then((data) => {
            setTeams((prevTeams) =>
              prevTeams.map((t, i) => (i === index ? data : t))
            );
          })
          .catch(() => {});
      })
      .catch(() => {});
  };

  return (
    <TeamContext.Provider value={{ teams, modifyTeam, loading }}>
      {children}
    </TeamContext.Provider>
  );
};

/**
 * useTeam is a custom hook to access the TeamContext.
 *
 * Throws an error if used outside of a ScoreProvider.
 *
 * Returns:
 * - `TeamContextProps`: The context value containing scores, modifyScores, and loading state.
 */
export const useTeam = (): TeamContextProps => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeam must be used within a ScoreProvider");
  }
  return context;
};
