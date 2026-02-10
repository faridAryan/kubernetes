import { prisma } from "./prisma";

export const XP_PER_LEVEL = 500;

export function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpForNextLevel(currentXp: number): number {
  const currentLevel = calculateLevel(currentXp);
  return currentLevel * XP_PER_LEVEL - currentXp;
}

export function xpProgress(currentXp: number): number {
  const currentLevel = calculateLevel(currentXp);
  const levelStartXp = (currentLevel - 1) * XP_PER_LEVEL;
  return ((currentXp - levelStartXp) / XP_PER_LEVEL) * 100;
}

export const LEVEL_TITLES: Record<number, string> = {
  1: "Pod Novice",
  2: "Container Apprentice",
  3: "Deployment Cadet",
  4: "Service Scout",
  5: "Namespace Navigator",
  6: "ConfigMap Crafter",
  7: "Volume Voyager",
  8: "Ingress Inspector",
  9: "StatefulSet Sage",
  10: "Helm Hero",
  11: "Operator Oracle",
  12: "RBAC Ranger",
  13: "Network Ninja",
  14: "Security Sentinel",
  15: "Cluster Commander",
  16: "Platform Architect",
  17: "Cloud Native Champion",
  18: "Kubernetes Knight",
  19: "Infrastructure Overlord",
  20: "K8s Grandmaster",
};

export function getLevelTitle(level: number): string {
  if (level >= 20) return LEVEL_TITLES[20];
  return LEVEL_TITLES[level] || `Level ${level} Explorer`;
}

export async function awardXp(
  userId: string,
  amount: number,
  type: string,
  description: string
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { xp: { increment: amount } },
  });

  const newLevel = calculateLevel(user.xp);
  if (newLevel > user.level) {
    await prisma.user.update({
      where: { id: userId },
      data: { level: newLevel },
    });

    await prisma.achievement.create({
      data: {
        userId,
        type: "level_up",
        description: `Reached level ${newLevel}: ${getLevelTitle(newLevel)}`,
        xpEarned: 0,
      },
    });
  }

  await prisma.achievement.create({
    data: { userId, type, description, xpEarned: amount },
  });

  return user.xp;
}
