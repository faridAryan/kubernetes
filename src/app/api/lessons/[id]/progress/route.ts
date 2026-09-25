import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/gamification";

const ALLOWED_STATUSES = ["not_started", "in_progress", "completed"];

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { status, score } = await request.json();

  if (ALLOWED_STATUSES.includes(status) === false) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const [lesson, previous] = await Promise.all([
    prisma.lesson.findUnique({
      where: { id: params.id },
      select: {
        title: true,
        xpReward: true,
        module: { select: { certificationId: true } },
      },
    }),
    prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: params.id } },
      select: { status: true },
    }),
  ]);

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const isCompleted = status === "completed";
  const data = {
    status,
    score: score ?? undefined,
    completedAt: isCompleted ? new Date() : undefined,
  };

  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId: params.id } },
    update: data,
    create: { userId, lessonId: params.id, ...data },
  });

  // Reward only the first completion so repeated submissions can't farm XP
  const isFirstCompletion = isCompleted && previous?.status !== "completed";

  if (isFirstCompletion) {
    const certificationId = lesson.module.certificationId;

    const [, totalLessons, completedLessons] = await Promise.all([
      awardXp(userId, lesson.xpReward, "lesson_complete", `Completed lesson: ${lesson.title}`),
      prisma.lesson.count({ where: { module: { certificationId } } }),
      prisma.lessonProgress.count({
        where: { userId, status: "completed", lesson: { module: { certificationId } } },
      }),
    ]);

    await prisma.enrollment.updateMany({
      where: { userId, certificationId },
      data: { progress: Math.round((completedLessons / totalLessons) * 100) },
    });
  }

  return NextResponse.json(progress);
}
