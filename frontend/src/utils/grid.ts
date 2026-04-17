import { Question } from "../types/Question";

export interface GridComputationResult {
  numColumns: number;
  numRows: number;
  computedCategories: string[];
  normalizedQuestions: Question[];
}

/**
 * Computes the grid layout for the board given a set of questions.
 * Handles both categorized and uncategorized sets.
 */
export function computeBoardGrid(questions: Question[]): GridComputationResult {
  if (questions.length === 0) {
    return {
      numColumns: 1,
      numRows: 1,
      computedCategories: ["Category 1"],
      normalizedQuestions: [
        {
          id: "blank-0-0",
          questionText: "",
          answerText: "",
          referenceText: "",
          revealed: false,
        },
      ],
    };
  }

  const uniqueCategories = Array.from(
    new Set(questions.map((q) => q.category).filter((c): c is string => !!c))
  );

  const hasCategories = uniqueCategories.length > 0;

  let columns: number;
  let rows: number;
  let cats: string[];
  let questionsByCategory: Question[][] = [];

  if (hasCategories) {
    cats = uniqueCategories;
    columns = cats.length;
    questionsByCategory = cats.map((cat) => {
      return questions.filter((q) => q.category === cat);
    });
    rows = Math.max(...questionsByCategory.map((arr) => arr.length), 1);
    
    for (let col = 0; col < columns; col++) {
      while (questionsByCategory[col].length < rows) {
        questionsByCategory[col].push({
          id: `blank-${questionsByCategory[col].length}-${col}`,
          questionText: "",
          answerText: "",
          referenceText: "",
          revealed: false,
        });
      }
    }
  } else {
    const totalQuestions = questions.length;
    const targetRows = [5, 4, 3];

    rows = 1;
    for (const r of targetRows) {
      if (totalQuestions % r === 0) {
        rows = r;
        break;
      }
    }
    if (rows === 1) {
      rows = targetRows[targetRows.length - 1];
    }

    columns = Math.ceil(totalQuestions / rows);
    cats = Array.from({ length: columns }, (_, i) => `Category ${i + 1}`);

    for (let col = 0; col < columns; col++) {
      const start = col * rows;
      const end = Math.min(start + rows, totalQuestions);
      const colQuestions = questions.slice(start, end);
      while (colQuestions.length < rows) {
        colQuestions.push({
          id: `blank-${colQuestions.length}-${col}`,
          questionText: "",
          answerText: "",
          referenceText: "",
          revealed: false,
        });
      }
      questionsByCategory.push(colQuestions);
    }
  }

  const normalized: Question[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      normalized.push(questionsByCategory[col][row]);
    }
  }

  return {
    numColumns: columns,
    numRows: rows,
    computedCategories: cats,
    normalizedQuestions: normalized,
  };
}
