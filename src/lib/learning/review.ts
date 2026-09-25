import { Prisma } from "@prisma/client";

const DAY_MS = 86_400_000;
const GRADUATE_AFTER_DAYS = 16;

// Spaced repetition: a wrong answer schedules a review tomorrow,
// each correct review doubles the gap until the question graduates.
export async function scheduleReview(
  tx: Prisma.TransactionClient,
  userId: string,
  questionId: string,
  correct: boolean
) {
  const where = { userId_questionId: { userId, questionId } };
  const now = Date.now();

  if (correct === false) {
    await tx.reviewItem.upsert({
      where,
      update: { intervalDays: 1, dueAt: new Date(now + DAY_MS) },
      create: { userId, questionId, intervalDays: 1, dueAt: new Date(now + DAY_MS) },
    });
    return;
  }

  const item = await tx.reviewItem.findUnique({ where, select: { intervalDays: true, dueAt: true } });
  const isDue = item !== null && item.dueAt.getTime() <= now;
  if (isDue === false) return;

  const intervalDays = item.intervalDays * 2;
  if (intervalDays >= GRADUATE_AFTER_DAYS) {
    await tx.reviewItem.delete({ where });
    return;
  }

  await tx.reviewItem.update({
    where,
    data: { intervalDays, dueAt: new Date(now + intervalDays * DAY_MS) },
  });
}
