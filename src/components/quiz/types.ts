export interface QuizQuestion {
  id: string;
  question: string;
  type: "multiple_choice" | "true_false" | "multi_select";
  options: string[];
}

export interface AnswerResult {
  correct: boolean;
  correctAnswer: string | string[];
  explanation: string;
  xpEarned: number;
}
