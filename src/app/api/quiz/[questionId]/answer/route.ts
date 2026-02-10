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

  const { answer } = await request.json();

  const question = await prisma.quizQuestion.findUnique({
    where: { id: params.questionId },
    include: { lesson: true },
  });

  if (!question) {
    return NextResponse.json(
      { error: "Question not found" },
      { status: 404 }
    );
  }

  const correctAnswer = JSON.parse(question.correctAnswer);
  const isCorrect =
    JSON.stringify(answer) === JSON.stringify(correctAnswer);

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: session.user.id,
      questionId: params.questionId,
      answer: JSON.stringify(answer),
      correct: isCorrect,
      xpEarned: isCorrect ? question.xpReward : 0,
    },
  });

  if (isCorrect) {
    await awardXp(
      session.user.id,
      question.xpReward,
      "quiz_correct",
      `Correctly answered quiz question`
    );
  }

  return NextResponse.json({
    correct: isCorrect,
    correctAnswer,
    explanation: question.explanation,
    xpEarned: isCorrect ? question.xpReward : 0,
  });
}
