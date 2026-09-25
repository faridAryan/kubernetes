import { Prisma } from "@prisma/client";

type Answer = string | string[];

// Order-insensitive for multi-select answers
export function isCorrectAnswer(correct: Prisma.JsonValue, answer: Answer): boolean {
  if (Array.isArray(correct) && Array.isArray(answer)) {
    const expected = [...correct].map(String).sort();
    const given = [...answer].sort();
    return expected.length === given.length && expected.every((value, i) => value === given[i]);
  }
  return typeof correct === "string" && correct === answer;
}

// Fisher-Yates shuffle returning a new array
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Score = share of questions whose latest attempt was correct
export async function getQuizScore(
  tx: Prisma.TransactionClient,
  userId: string,
  lessonId: string
): Promise<{ answeredAll: boolean; score: number }> {
  const questions = await tx.quizQuestion.findMany({
    where: { lessonId },
    select: {
      attempts: {
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { correct: true },
      },
    },
  });

  const answered = questions.filter((q) => q.attempts.length > 0);
  const correct = answered.filter((q) => q.attempts[0].correct).length;

  return {
    answeredAll: questions.length > 0 && answered.length === questions.length,
    score: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0,
  };
}
