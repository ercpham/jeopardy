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
  releaseBuzzLock: () => void;
  buzzIn: (index: number) => void;
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
 * TeamProvider component wraps its children with the TeamContext.
 *
 * Props:
 * - `children`: The child components that will have access to the TeamContext.
 */
export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [teams, setTeams] = useState<Team[]>(defaultTeams);
  const [buzzLock, setBuzzLock] = useState(false);
  const [loading, setLoading] = useState(true);
  const { sessionId, setSessionId } = useSession();

  /**
   * Fetches the list of teams for the current session from the API.
   *
   * Returns:
   * - A promise that resolves to the list of teams or the default teams if the API call fails.
   */
  const fetchTeams = () => {
    return fetch(`${API_URL}/session/${sessionId}/teams`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setTeams(data || defaultTeams);
        setLoading(false);
      });
  };

  /**
   * Handles the buzz-in action for a team.
   *
   * Parameters:
   * - `teamIndex`: The index of the team that buzzed in.
   *
   * Behavior:
   * - If no session is active and no buzz lock is set, sets the buzz lock and updates the team's state.
   * - If a session is active, sends a buzz-in request to the API and updates the team's state based on the response.
   */
  const buzzIn = (teamIndex: number) => {
    if (!sessionId && !buzzLock) {
      setBuzzLock(true);
      setTeams((prevTeams) =>
        prevTeams.map((team, index) =>
          index === teamIndex
            ? { ...team, buzz_lock_owned: true }
            : { ...team, buzz_lock_owned: false }
        )
      );
      return;
    }

    fetchTeams();

    if (buzzLock) {
      return;
    }

    fetch(`${API_URL}/session/${sessionId}/buzz/${teamIndex}`, {
      method: "POST",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data == "Success") {
          setBuzzLock(true);
          setTeams((prevTeams) =>
            prevTeams.map((team, index) =>
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
   * Releases the buzz lock for the current session.
   *
   * Behavior:
   * - If no session is active, resets the buzz lock and updates the team's state.
   * - If a session is active, sends a release request to the API and updates the team's state based on the response.
   */
  const releaseBuzzLock = () => {
    if (!sessionId) {
      setBuzzLock(false);
      setTeams((prevTeams) =>
        prevTeams.map((team) => ({ ...team, buzz_lock_owned: false }))
      );
      return;
    }

    fetch(`${API_URL}/session/${sessionId}/buzz/release`, {
      method: "POST",
    })
      .then(() => {
        setBuzzLock(false);
      })
      .catch(() => {});

    fetchTeams();
  };

  /**
   * Modifies the information of a specific team.
   *
   * Parameters:
   * - `team`: The updated team information.
   * - `index`: The index of the team to be updated.
   *
   * Behavior:
   * - If no session is active, updates the team's state locally.
   * - If a session is active, sends an update request to the API and updates the team's state based on the response.
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
    fetchTeams();
  };

  /**
   * Initializes the team state and sets up periodic fetching of team data.
   *
   * Behavior:
   * - If no session is active, resets the team state to default values.
   * - If a session is active, fetches the team data periodically and updates the state.
   */
  useEffect(() => {
    if (!sessionId) {
      setTeams(defaultTeams);
      setBuzzLock(false);
      setLoading(false);
      return;
    }

    const internalFetchTeams = () => {
      fetchTeams().catch(() => {
        setSessionId(null);
        setTeams(defaultTeams);
        setLoading(false);
        clearInterval(intervalId);
      });
    };

    setLoading(true);
    internalFetchTeams();
    const intervalId = setInterval(internalFetchTeams, 1000);

    return () => clearInterval(intervalId);
  }, [sessionId]);

  return (
    <TeamContext.Provider
      value={{ teams, modifyTeam, releaseBuzzLock, buzzIn, loading }}
    >
      {children}
    </TeamContext.Provider>
  );
};

/**
 * useTeam is a custom hook to access the TeamContext.
 *
 * Throws an error if used outside of a TeamProvider.
 *
 * Returns:
 * - `TeamContextProps`: The context value containing scores, modifyScores, and loading state.
 */
export const useTeam = (): TeamContextProps => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
};
