export const XP_PER_LEVEL = 500;

export function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpForNextLevel(currentXp: number): number {
  return calculateLevel(currentXp) * XP_PER_LEVEL - currentXp;
}

export function xpProgress(currentXp: number): number {
  return ((currentXp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
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
