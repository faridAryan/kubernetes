import { AchievementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/gamification/xp";
import { issueCertificateIfEligible } from "./certificate";

// Marks a lesson completed. XP, enrollment progress and certificates are handled only on the first completion.
export async function completeLesson(userId: string, lessonId: string, score?: number) {
  return prisma.$transaction(async (tx) => {
    const lesson = await tx.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      select: {
        title: true,
        type: true,
        xpReward: true,
        module: { select: { certificationId: true } },
        progress: { where: { userId }, select: { status: true } },
      },
    });

    const isFirstCompletion = lesson.progress[0]?.status !== "completed";
    const data = { status: "completed" as const, score, completedAt: new Date() };

    await tx.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: isFirstCompletion ? data : { score },
      create: { userId, lessonId, ...data },
    });

    if (isFirstCompletion === false) return { firstCompletion: false, badges: [] };

    const certificationId = lesson.module.certificationId;
    const [totalLessons, completedLessons] = await Promise.all([
      tx.lesson.count({ where: { module: { certificationId } } }),
      tx.lessonProgress.count({
        where: { userId, status: "completed", lesson: { module: { certificationId } } },
      }),
    ]);
    const progress = Math.round((completedLessons / totalLessons) * 100);

    // Learning a lesson auto-enrolls the user in its path
    await tx.enrollment.upsert({
      where: { userId_certificationId: { userId, certificationId } },
      update: { progress, completedAt: progress === 100 ? new Date() : null },
      create: { userId, certificationId, progress, completedAt: progress === 100 ? new Date() : null },
    });

    const isLab = lesson.type === "lab";
    const { badges } = await awardXp(
      tx,
      userId,
      lesson.xpReward,
      isLab ? AchievementType.lab_complete : AchievementType.lesson_complete,
      `${isLab ? "Completed lab" : "Completed lesson"}: ${lesson.title}`
    );

    if (progress === 100) await issueCertificateIfEligible(tx, userId, certificationId);

    return { firstCompletion: true, badges };
  });
}
