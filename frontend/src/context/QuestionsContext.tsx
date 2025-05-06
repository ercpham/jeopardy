import React, { createContext, useContext, useState, ReactNode } from "react";
import questionsData from "../data/sample_questions.json";

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

const QuestionsContext = createContext<QuestionsContextType | undefined>(
  undefined
);

const defaultQuestions: Question[] = questionsData;

export const QuestionsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [questions, setQuestionsState] = useState<Question[]>(defaultQuestions);

  const setQuestions: React.Dispatch<React.SetStateAction<Question[]>> = (
    newQuestions
  ) => {
    if (typeof newQuestions === "function") {
      // Handle functional updates
      setQuestionsState((prevQuestions) =>
        shuffleArray(
          (newQuestions as (prev: Question[]) => Question[])(prevQuestions)
        )
      );
    } else {
      // Handle direct updates
      setQuestionsState(shuffleArray(newQuestions));
    }
  };

  const revealAnswer = (id: string) => {
    setQuestionsState((prevQuestions) =>
      prevQuestions.map((question) =>
        question.id === id ? { ...question, revealed: true } : question
      )
    );
  };

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

export const useQuestions = (): QuestionsContextType => {
  const context = useContext(QuestionsContext);
  if (!context) {
    throw new Error("useQuestions must be used within a QuestionsProvider");
  }
  return context;
};
