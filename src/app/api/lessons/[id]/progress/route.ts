import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/gamification";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status, score } = await request.json();

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.id },
    include: { module: true },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const progress = await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId: session.user.id,
        lessonId: params.id,
      },
    },
    update: {
      status,
      score: score ?? undefined,
      completedAt: status === "completed" ? new Date() : undefined,
    },
    create: {
      userId: session.user.id,
      lessonId: params.id,
      status,
      score: score ?? undefined,
      completedAt: status === "completed" ? new Date() : undefined,
    },
  });

  if (status === "completed") {
    await awardXp(
      session.user.id,
      lesson.xpReward,
      "lesson_complete",
      `Completed lesson: ${lesson.title}`
    );

    // Update enrollment progress
    const totalLessons = await prisma.lesson.count({
      where: { module: { certificationId: lesson.module.certificationId } },
    });
    const completedLessons = await prisma.lessonProgress.count({
      where: {
        userId: session.user.id,
        status: "completed",
        lesson: { module: { certificationId: lesson.module.certificationId } },
      },
    });

    await prisma.enrollment.updateMany({
      where: {
        userId: session.user.id,
        certificationId: lesson.module.certificationId,
      },
      data: {
        progress: Math.round((completedLessons / totalLessons) * 100),
      },
    });
  }

  return NextResponse.json(progress);
}
