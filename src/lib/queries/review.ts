import { prisma } from "@/lib/prisma";
import { shuffle } from "@/lib/learning/quiz";

export async function getDueReviews(userId: string) {
  const items = await prisma.reviewItem.findMany({
    where: { userId, dueAt: { lte: new Date() } },
    orderBy: { dueAt: "asc" },
    take: 10,
    select: {
      question: {
        select: { id: true, question: true, type: true, options: true, explanation: true, xpReward: true },
      },
    },
  });

  return items.map(({ question }) => ({
    ...question,
    options: question.type === "true_false" ? (question.options as string[]) : shuffle(question.options as string[]),
  }));
}

export async function getNextReviewDate(userId: string) {
  const next = await prisma.reviewItem.findFirst({
    where: { userId },
    orderBy: { dueAt: "asc" },
    select: { dueAt: true },
  });
  return next?.dueAt ?? null;
}
