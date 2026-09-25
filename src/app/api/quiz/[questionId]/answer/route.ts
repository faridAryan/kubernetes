import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/gamification";

export async function POST(
  request: Request,
  { params }: { params: { questionId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { answer } = await request.json();

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

  if (!question) {
    return NextResponse.json(
      { error: "Question not found" },
      { status: 404 }
    );
  }

  const correctAnswer = JSON.parse(question.correctAnswer);
  const serializedAnswer = JSON.stringify(answer);
  const isCorrect = serializedAnswer === JSON.stringify(correctAnswer);

  // XP is granted only for the first correct answer to a question
  const xpEarned = isCorrect && previousCorrect === null ? question.xpReward : 0;

  await Promise.all([
    prisma.quizAttempt.create({
      data: {
        userId,
        questionId: params.questionId,
        answer: serializedAnswer,
        correct: isCorrect,
        xpEarned,
      },
      select: { id: true },
    }),
    xpEarned > 0
      ? awardXp(userId, xpEarned, "quiz_correct", "Correctly answered quiz question")
      : null,
  ]);

  return NextResponse.json({
    correct: isCorrect,
    correctAnswer,
    explanation: question.explanation,
    xpEarned,
  });
}
