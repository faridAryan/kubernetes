import { Prisma } from "@prisma/client";
import { z } from "zod";

const requirementSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("lessons_completed"), count: z.number() }),
  z.object({ type: z.literal("labs_completed"), count: z.number() }),
  z.object({ type: z.literal("perfect_quiz"), count: z.number() }),
  z.object({ type: z.literal("exams_passed"), count: z.number() }),
  z.object({ type: z.literal("streak"), count: z.number() }),
  z.object({ type: z.literal("level"), count: z.number() }),
  z.object({ type: z.literal("cert_complete"), cert: z.string() }),
]);

export type BadgeRequirement = z.infer<typeof requirementSchema>;

interface UserStats {
  lessonsCompleted: number;
  labsCompleted: number;
  perfectQuizzes: number;
  examsPassed: number;
  streak: number;
  level: number;
  completedCerts: Set<string>;
}

function meetsRequirement(requirement: BadgeRequirement, stats: UserStats): boolean {
  switch (requirement.type) {
    case "lessons_completed":
      return stats.lessonsCompleted >= requirement.count;
    case "labs_completed":
      return stats.labsCompleted >= requirement.count;
    case "perfect_quiz":
      return stats.perfectQuizzes >= requirement.count;
    case "exams_passed":
      return stats.examsPassed >= requirement.count;
    case "streak":
      return stats.streak >= requirement.count;
    case "level":
      return stats.level >= requirement.count;
    case "cert_complete":
      return stats.completedCerts.has(requirement.cert);
  }
}

async function loadStats(
  tx: Prisma.TransactionClient,
  userId: string,
  streak: number,
  level: number
): Promise<UserStats> {
  const completed = { userId, status: "completed" } as const;

  const [lessonsCompleted, labsCompleted, perfectQuizzes, examsPassed, certs] = await Promise.all([
    tx.lessonProgress.count({ where: completed }),
    tx.lessonProgress.count({ where: { ...completed, lesson: { type: "lab" } } }),
    tx.lessonProgress.count({ where: { ...completed, score: 100, lesson: { type: "quiz" } } }),
    tx.examAttempt.count({ where: { userId, passed: true } }),
    tx.enrollment.findMany({
      where: { userId, completedAt: { not: null } },
      select: { certification: { select: { slug: true } } },
    }),
  ]);

  return {
    lessonsCompleted,
    labsCompleted,
    perfectQuizzes,
    examsPassed,
    streak,
    level,
    completedCerts: new Set(certs.map((c) => c.certification.slug)),
  };
}

// Returns the badges the user has just qualified for
export async function findNewBadges(
  tx: Prisma.TransactionClient,
  userId: string,
  streak: number,
  level: number
) {
  const [candidates, stats] = await Promise.all([
    tx.badge.findMany({
      where: { users: { none: { userId } } },
      select: { id: true, name: true, requirement: true, xpReward: true },
    }),
    loadStats(tx, userId, streak, level),
  ]);

  return candidates.filter((badge) => {
    const requirement = requirementSchema.safeParse(badge.requirement);
    return requirement.success && meetsRequirement(requirement.data, stats);
  });
}
