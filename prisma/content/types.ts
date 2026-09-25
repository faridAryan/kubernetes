import type { BadgeCategory, Difficulty, QuestionType } from "@prisma/client";
import type { LabCheck, ResourceSeed } from "../../src/lib/lab/types";

export interface QuestionContent {
  question: string;
  type: QuestionType;
  options: string[];
  answer: string | string[];
  explanation: string;
  xp?: number;
}

interface LessonBase {
  slug: string;
  title: string;
  duration: number; // minutes
  xp: number;
}

// Reading bodies and lab instructions live in lessons/<cert>/<module>/<slug>.md
export type LessonContent =
  | (LessonBase & { type: "reading" })
  | (LessonBase & { type: "quiz"; intro: string; questions: QuestionContent[] })
  | (LessonBase & {
      type: "lab";
      intro: string;
      timeLimit: number;
      hints: string[];
      initialState?: ResourceSeed[];
      checks: LabCheck[];
    });

export interface ModuleContent {
  slug: string;
  name: string;
  description: string;
  xp: number;
  lessons: LessonContent[];
}

export interface CertificationContent {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
  difficulty: Difficulty;
  estimatedHours: number;
  order: number;
  exam: { questions: number; minutes: number; passPercent: number };
  modules: ModuleContent[];
}

export interface BadgeContent {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  requirement: Record<string, string | number>;
  xp: number;
}
