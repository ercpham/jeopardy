import React, { createContext, useContext, useState, ReactNode } from "react";
import questionsData from "../data/sample_questions.json";

/**
 * QuestionsContext provides state management for questions in the application.
 * 
 * This context is used to manage the list of questions, reveal answers, and reset questions.
 */
const QuestionsContext = createContext<QuestionsContextType | undefined>(
  undefined
);

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export interface Question {
  id: string;
  questionText: string;
  answerText: string;
  referenceText: string;
  revealed: boolean;
}

interface QuestionsContextType {
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  revealAnswer: (id: string) => void;
  resetQuestions: () => void;
}

const defaultQuestions: Question[] = questionsData;

/**
 * QuestionsProvider component wraps its children with the QuestionsContext.
 * 
 * Props:
 * - `children`: The child components that will have access to the QuestionsContext.
 */
export const QuestionsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [questions, setQuestionsState] = useState<Question[]>(defaultQuestions);

  const setQuestions: React.Dispatch<React.SetStateAction<Question[]>> = (
    newQuestions
  ) => {
    if (typeof newQuestions === "function") {
      setQuestionsState((prevQuestions) =>
        shuffleArray(
          (newQuestions as (prev: Question[]) => Question[])(prevQuestions)
        )
      );
    } else {
      setQuestionsState(shuffleArray(newQuestions));
    }
  };

  /**
   * Reveals the answer for a specific question by its ID.
   * 
   * Parameters:
   * - `id`: The ID of the question to reveal.
   */
  const revealAnswer = (id: string) => {
    setQuestionsState((prevQuestions) =>
      prevQuestions.map((question) =>
        question.id === id ? { ...question, revealed: true } : question
      )
    );
  };

  /**
   * Resets all questions to their initial state (unrevealed).
   */
  const resetQuestions = () => {
    setQuestionsState((prevQuestions) =>
      prevQuestions.map((question) => ({ ...question, revealed: false }))
    );
  };

  return (
    <QuestionsContext.Provider
      value={{ questions, setQuestions, revealAnswer, resetQuestions }}
    >
      {children}
    </QuestionsContext.Provider>
  );
};

/**
 * useQuestions is a custom hook to access the QuestionsContext.
 * 
 * Throws an error if used outside of a QuestionsProvider.
 * 
 * Returns:
 * - `QuestionsContextType`: The context value containing questions, setQuestions, revealAnswer, and resetQuestions.
 */
export const useQuestions = (): QuestionsContextType => {
  const context = useContext(QuestionsContext);
  if (!context) {
    throw new Error("useQuestions must be used within a QuestionsProvider");
  }
  return context;
};
