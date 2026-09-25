import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError, parseBody } from "@/lib/http";
import { completeLesson } from "@/lib/learning/progress";
import { getQuizScore } from "@/lib/learning/quiz";
import { isLessonUnlocked } from "@/lib/learning/unlock";
import { progressSchema } from "@/lib/validation/lesson";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId();
  if (userId === null) return jsonError("Unauthorized", 401);

  const parsed = await parseBody(request, progressSchema);
  if (parsed.error) return parsed.error;

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.id },
    select: { type: true },
  });
  if (lesson === null) return jsonError("Lesson not found", 404);

  if (await isLessonUnlocked(userId, params.id) === false) {
    return jsonError("Complete the previous module first", 403);
  }

  if (parsed.data.status === "in_progress") {
    // Never downgrade a completed lesson
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: params.id } },
      update: {},
      create: { userId, lessonId: params.id, status: "in_progress" },
    });
    return NextResponse.json({ status: "in_progress" });
  }

  // Labs complete only through server-side validation
  if (lesson.type === "lab") return jsonError("Labs are completed by validating them", 400);

  let score: number | undefined;
  if (lesson.type === "quiz") {
    const quiz = await getQuizScore(prisma, userId, params.id);
    if (quiz.answeredAll === false) return jsonError("Answer every question first", 400);
    score = quiz.score;
  }

  const result = await completeLesson(userId, params.id, score);
  return NextResponse.json({ status: "completed", score, ...result });
}
