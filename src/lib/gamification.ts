import { prisma } from "./prisma";
import { calculateLevel, getLevelTitle } from "./levels";

export async function awardXp(
  userId: string,
  amount: number,
  type: string,
  description: string
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { xp: { increment: amount } },
      select: { xp: true, level: true },
    });

    const achievements = [{ userId, type, description, xpEarned: amount }];
    const newLevel = calculateLevel(user.xp);

    if (newLevel > user.level) {
      achievements.push({
        userId,
        type: "level_up",
        description: `Reached level ${newLevel}: ${getLevelTitle(newLevel)}`,
        xpEarned: 0,
      });
      await tx.user.update({
        where: { id: userId },
        data: { level: newLevel },
        select: { id: true },
      });
    }

    await tx.achievement.createMany({ data: achievements });

    return user.xp;
  });
}
