import { AchievementType, Prisma } from "@prisma/client";
import { calculateLevel, getLevelTitle } from "@/lib/levels";
import { findNewBadges } from "./badges";
import { nextStreak } from "./streak";

// Grants XP, advances the activity streak, awards any newly earned badges and level-ups.
// Must run inside a transaction so the reward and the action that earned it commit together.
export async function awardXp(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  type: AchievementType,
  description: string
) {
  const now = new Date();
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { xp: true, level: true, streak: true, longestStreak: true, lastActiveAt: true },
  });

  const streak = nextStreak(user.streak, user.lastActiveAt, now);
  const newBadges = await findNewBadges(tx, userId, streak, calculateLevel(user.xp + amount));
  const badgeXp = newBadges.reduce((sum, badge) => sum + badge.xpReward, 0);

  const updated = await tx.user.update({
    where: { id: userId },
    data: {
      xp: { increment: amount + badgeXp },
      streak,
      longestStreak: Math.max(streak, user.longestStreak),
      lastActiveAt: now,
    },
    select: { xp: true },
  });

  const achievements: Prisma.AchievementCreateManyInput[] = [
    { userId, type, description, xpEarned: amount },
    ...newBadges.map((badge) => ({
      userId,
      type: AchievementType.badge_earned,
      description: `Earned badge: ${badge.name}`,
      xpEarned: badge.xpReward,
    })),
  ];

  const newLevel = calculateLevel(updated.xp);
  if (newLevel > user.level) {
    achievements.push({
      userId,
      type: AchievementType.level_up,
      description: `Reached level ${newLevel}: ${getLevelTitle(newLevel)}`,
      xpEarned: 0,
    });
    await tx.user.update({ where: { id: userId }, data: { level: newLevel }, select: { id: true } });
  }

  await Promise.all([
    tx.achievement.createMany({ data: achievements }),
    newBadges.length > 0
      ? tx.userBadge.createMany({
          data: newBadges.map((badge) => ({ userId, badgeId: badge.id })),
          skipDuplicates: true,
        })
      : null,
  ]);

  return { xp: updated.xp, badges: newBadges.map((badge) => badge.name) };
}
