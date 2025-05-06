import React, { createContext, useContext, useState, useEffect } from "react";

interface Scores {
  team1: number;
  team2: number;
  team3: number;
}

interface ScoreContextProps {
  scores: Scores;
  modifyScores: (amounts: Scores) => void;
}

const ScoreContext = createContext<ScoreContextProps | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

export const ScoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scores, setScores] = useState<Scores>({ team1: 0, team2: 0, team3: 0 });

  useEffect(() => {
    // Fetch the initial scores from the server
    fetch(`${API_URL}/scores`)
      .then((response) => response.json())
      .then((data) => setScores(data))
      .catch((error) => console.error("Error fetching scores:", error));
  }, []);

  const modifyScores = (amounts: Scores) => {
    fetch(`${API_URL}/scores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(amounts),
    })
      .then((response) => response.json())
      .then((data) => setScores(data))
      .catch((error) => console.error("Error setting scores:", error));
  };

  return (
    <ScoreContext.Provider value={{ scores, modifyScores }}>
      {children}
    </ScoreContext.Provider>
  );
};

export const useScore = (): ScoreContextProps => {
  const context = useContext(ScoreContext);
  if (!context) {
    throw new Error("useScore must be used within a ScoreProvider");
  }
  return context;
};