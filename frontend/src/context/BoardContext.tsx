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
  targetScore: number | null;
  setTargetScore: React.Dispatch<React.SetStateAction<number | null>>;
  editableCategories: string[];
  setEditableCategories: React.Dispatch<React.SetStateAction<string[]>>;
  /** Fingerprint of the data-derived categories that were last used to seed editableCategories. */
  sourceCategoriesKey: string;
  setSourceCategoriesKey: React.Dispatch<React.SetStateAction<string>>;
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
  const [targetScore, setTargetScore] = useState<number | null>(null);
  const [editableCategories, setEditableCategories] = useState<string[]>([]);
  const [sourceCategoriesKey, setSourceCategoriesKey] = useState<string>("");

  /**
   * Resets the clicked cells to an empty set.
   */
  const resetClickedCells = () => {
    setClickedCells(new Set());
    setTargetScore(0);
    setEditableCategories([]);
    setSourceCategoriesKey("");
  };

  return (
    <BoardContext.Provider
      value={{
        clickedCells,
        setClickedCells,
        recentlyClickedIndex,
        setRecentlyClickedIndex,
        targetScore,
        setTargetScore,
        editableCategories,
        setEditableCategories,
        sourceCategoriesKey,
        setSourceCategoriesKey,
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
 * - `BoardContextType`: The context value containing clickedCells, setClickedCells, recentlyClickedIndex, setRecentlyClickedIndex, targetScore, setTargetScore, editableCategories, setEditableCategories, and resetClickedCells.
 */
export const useBoard = (): BoardContextType => {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error("useBoard must be used within a BoardProvider");
  }
  return context;
};
