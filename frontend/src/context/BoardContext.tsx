import React, { createContext, useContext, useState, ReactNode } from "react";

/**
 * BoardContext provides state management for clicked cells on a board.
 * 
 * This context is used to track which cells have been clicked and provides
 * functionality to reset the clicked cells.
 */
interface BoardContextType {
  clickedCells: Set<string>;
  setClickedCells: React.Dispatch<React.SetStateAction<Set<string>>>;
  recentlyClickedIndex: number | null;
  setRecentlyClickedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  targetScore: number | null; // Add targetScore to the context
  setTargetScore: React.Dispatch<React.SetStateAction<number | null>>; // Add setter for targetScore
  resetClickedCells: () => void;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

/**
 * BoardProvider component wraps its children with the BoardContext.
 * 
 * Props:
 * - `children`: The child components that will have access to the BoardContext.
 */
export const BoardProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [clickedCells, setClickedCells] = useState<Set<string>>(new Set());
  const [recentlyClickedIndex, setRecentlyClickedIndex] = useState<number | null>(null);
  const [targetScore, setTargetScore] = useState<number | null>(null); // Initialize targetScore state

  /**
   * Resets the clicked cells to an empty set.
   */
  const resetClickedCells = () => {
    setClickedCells(new Set());
    setTargetScore(0);
  };

  return (
    <BoardContext.Provider
      value={{
        clickedCells,
        setClickedCells,
        recentlyClickedIndex,
        setRecentlyClickedIndex,
        targetScore,
        setTargetScore, // Provide setTargetScore in the context
        resetClickedCells,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
};

/**
 * useBoard is a custom hook to access the BoardContext.
 * 
 * Throws an error if used outside of a BoardProvider.
 * 
 * Returns:
 * - `BoardContextType`: The context value containing clickedCells, setClickedCells, recentlyClickedIndex, setRecentlyClickedIndex, targetScore, setTargetScore, and resetClickedCells.
 */
export const useBoard = (): BoardContextType => {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error("useBoard must be used within a BoardProvider");
  }
  return context;
};
