import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "./SessionContext";

/**
 * ScoreContext provides state management for team scores in the application.
 * 
 * This context is used to manage the scores of teams, modify scores, and handle loading states.
 */
interface Scores {
  team1: number;
  team2: number;
  team3: number;
}

interface ScoreContextProps {
  scores: Scores;
  modifyScores: (amounts: Scores) => void;
  loading: boolean;
}

const ScoreContext = createContext<ScoreContextProps | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

/**
 * ScoreProvider component wraps its children with the ScoreContext.
 * 
 * Props:
 * - `children`: The child components that will have access to the ScoreContext.
 */
export const ScoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [scores, setScores] = useState<Scores>({
    team1: 0,
    team2: 0,
    team3: 0,
  });
  const [loading, setLoading] = useState(true);
  const { sessionId, setSessionId } = useSession();

  useEffect(() => {
    if (!sessionId) {
      setScores({ team1: 0, team2: 0, team3: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetchScores = () => {
      fetch(`${API_URL}/session/${sessionId}/scores`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          setScores(data || { team1: 0, team2: 0, team3: 0 });
          setLoading(false);
        })
        .catch(() => {
          setSessionId(null);
          setScores({ team1: 0, team2: 0, team3: 0 });
          setLoading(false);
          clearInterval(intervalId);
        });
    };

    fetchScores();
    const intervalId = setInterval(fetchScores, 5000);

    return () => clearInterval(intervalId);
  }, [sessionId]);

  /**
   * Modifies the scores for the current session.
   * 
   * Parameters:
   * - `amounts`: The new scores to be applied.
   */
  const modifyScores = (amounts: Scores) => {
    if (!sessionId) {
      setScores(() => ({
        team1: amounts.team1,
        team2: amounts.team2,
        team3: amounts.team3,
      }));
      return;
    }

    fetch(`${API_URL}/session/${sessionId}/modify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(amounts),
    })
      .then((response) => response.json())
      .then((data) => {
        setScores(data);
        fetch(`${API_URL}/session/${sessionId}/scores`)
          .then((response) => response.json())
          .then((data) => setScores(data))
          .catch(() => {});
      })
      .catch(() => {});
  };

  return (
    <ScoreContext.Provider value={{ scores, modifyScores, loading }}>
      {children}
    </ScoreContext.Provider>
  );
};

/**
 * useScore is a custom hook to access the ScoreContext.
 * 
 * Throws an error if used outside of a ScoreProvider.
 * 
 * Returns:
 * - `ScoreContextProps`: The context value containing scores, modifyScores, and loading state.
 */
export const useScore = (): ScoreContextProps => {
  const context = useContext(ScoreContext);
  if (!context) {
    throw new Error("useScore must be used within a ScoreProvider");
  }
  return context;
};
