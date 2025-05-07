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

  /**
   * Resets the clicked cells to an empty set.
   */
  const resetClickedCells = () => {
    setClickedCells(new Set());
  };

  return (
    <BoardContext.Provider
      value={{ clickedCells, setClickedCells, resetClickedCells }}
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
 * - `BoardContextType`: The context value containing clickedCells, setClickedCells, and resetClickedCells.
 */
export const useBoard = (): BoardContextType => {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error("useBoard must be used within a BoardProvider");
  }
  return context;
};
