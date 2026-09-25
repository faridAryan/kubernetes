import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentStreak } from "@/lib/gamification/streak";

export const getLeaderboard = unstable_cache(
  async () => {
    const users = await prisma.user.findMany({
      orderBy: { xp: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        xp: true,
        level: true,
        streak: true,
        lastActiveAt: true,
        _count: {
          select: {
            lessonProgress: { where: { status: "completed" } },
            badges: true,
          },
        },
      },
    });

    return users.map(({ _count, lastActiveAt, streak, ...user }) => ({
      ...user,
      streak: currentStreak(streak, lastActiveAt),
      lessonsCompleted: _count.lessonProgress,
      badges: _count.badges,
    }));
  },
  ["leaderboard"],
  { revalidate: 60 }
);
