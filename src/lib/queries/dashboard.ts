import { prisma } from "@/lib/prisma";
import { currentStreak } from "@/lib/gamification/streak";

export async function getDashboard(userId: string) {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      xp: true,
      level: true,
      streak: true,
      longestStreak: true,
      lastActiveAt: true,
      enrollments: {
        orderBy: { enrolledAt: "desc" },
        select: {
          id: true,
          progress: true,
          certification: { select: { slug: true, shortName: true, name: true, icon: true } },
        },
      },
      badges: {
        orderBy: { earnedAt: "desc" },
        select: { badge: { select: { slug: true, name: true, icon: true, description: true } } },
      },
      certificates: {
        select: { code: true, certification: { select: { shortName: true, icon: true } } },
      },
      achievements: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, type: true, description: true, xpEarned: true },
      },
      _count: {
        select: {
          lessonProgress: { where: { status: "completed", lesson: { type: { not: "lab" } } } },
          quizAttempts: { where: { correct: true } },
          labSessions: { where: { status: "completed" } },
          reviewItems: { where: { dueAt: { lte: now } } },
        },
      },
    },
  });
  if (user === null) return null;

  const { _count, streak, lastActiveAt, ...rest } = user;
  return {
    ...rest,
    streak: currentStreak(streak, lastActiveAt, now),
    lessonsCompleted: _count.lessonProgress,
    correctAnswers: _count.quizAttempts,
    labsCompleted: _count.labSessions,
    reviewsDue: _count.reviewItems,
  };
}
