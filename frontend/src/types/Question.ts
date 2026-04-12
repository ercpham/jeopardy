export interface Question {
  id: string;
  questionText: string;
  answerText: string;
  referenceText: string;
  revealed: boolean;
  category?: string;
  pointValue?: number;
}
