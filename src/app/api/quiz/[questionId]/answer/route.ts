import { NextResponse } from "next/server";
import { AchievementType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError, parseBody } from "@/lib/http";
import { isRateLimited } from "@/lib/rate-limit";
import { awardXp } from "@/lib/gamification/xp";
import { isCorrectAnswer } from "@/lib/learning/quiz";
import { scheduleReview } from "@/lib/learning/review";
import { answerSchema } from "@/lib/validation/quiz";

export async function POST(
  request: Request,
  { params }: { params: { questionId: string } }
) {
  const userId = await getUserId();
  if (userId === null) return jsonError("Unauthorized", 401);

  if (await isRateLimited(`quiz:${userId}`, 60, 60)) {
    return jsonError("Slow down a little", 429);
  }

  const parsed = await parseBody(request, answerSchema);
  if (parsed.error) return parsed.error;
  const { answer } = parsed.data;

  const [question, previousCorrect] = await Promise.all([
    prisma.quizQuestion.findUnique({
      where: { id: params.questionId },
      select: { correctAnswer: true, explanation: true, xpReward: true },
    }),
    prisma.quizAttempt.findFirst({
      where: { userId, questionId: params.questionId, correct: true },
      select: { id: true },
    }),
  ]);
  if (question === null) return jsonError("Question not found", 404);

  const correct = isCorrectAnswer(question.correctAnswer, answer);
  // XP is granted only for the first correct answer to a question
  const xpEarned = correct && previousCorrect === null ? question.xpReward : 0;

  await prisma.$transaction(async (tx) => {
    await tx.quizAttempt.create({
      data: { userId, questionId: params.questionId, answer, correct, xpEarned },
      select: { id: true },
    });
    await scheduleReview(tx, userId, params.questionId, correct);
    if (xpEarned > 0) {
      await awardXp(tx, userId, xpEarned, AchievementType.quiz_correct, "Correctly answered a quiz question");
    }
  });

  return NextResponse.json({
    correct,
    correctAnswer: question.correctAnswer as Prisma.JsonValue,
    explanation: question.explanation,
    xpEarned,
  });
}
