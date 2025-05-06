import React, { createContext, useContext, useState, ReactNode } from "react";

interface BoardContextType {
  clickedCells: Set<string>;
  setClickedCells: React.Dispatch<React.SetStateAction<Set<string>>>;
  resetClickedCells: () => void;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export const BoardProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [clickedCells, setClickedCells] = useState<Set<string>>(new Set());

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

export const useBoard = (): BoardContextType => {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error("useBoard must be used within a BoardProvider");
  }
  return context;
};
