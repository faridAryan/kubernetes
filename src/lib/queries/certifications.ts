import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { computeUnlockedModules } from "@/lib/learning/unlock";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export const getCertificationSummaries = unstable_cache(
  async () => {
    const certifications = await prisma.certificationPath.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        shortName: true,
        description: true,
        icon: true,
        difficulty: true,
        estimatedHours: true,
        modules: {
          orderBy: { order: "asc" },
          select: { id: true, name: true, lessons: { select: { xpReward: true } } },
        },
        _count: { select: { enrollments: true } },
      },
    });

    return certifications.map(({ modules, _count, ...cert }) => ({
      ...cert,
      enrollments: _count.enrollments,
      totalXp: sum(modules.flatMap((m) => m.lessons.map((l) => l.xpReward))),
      lessonCount: sum(modules.map((m) => m.lessons.length)),
      modules: modules.map((m) => ({ id: m.id, name: m.name, lessonCount: m.lessons.length })),
    }));
  },
  ["certification-summaries"],
  { revalidate: 300 }
);

export type CertificationSummary = Awaited<ReturnType<typeof getCertificationSummaries>>[number];

export async function getCertificationDetail(slug: string, userId: string | null) {
  const certification = await prisma.certificationPath.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      shortName: true,
      description: true,
      icon: true,
      difficulty: true,
      estimatedHours: true,
      examQuestionCount: true,
      examDurationMinutes: true,
      examPassPercent: true,
      modules: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          xpReward: true,
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              slug: true,
              title: true,
              type: true,
              xpReward: true,
              duration: true,
              progress: userId ? { where: { userId }, select: { status: true } } : false,
            },
          },
        },
      },
      enrollments: userId ? { where: { userId }, select: { progress: true } } : false,
      certificates: userId ? { where: { userId }, select: { code: true } } : false,
      examAttempts: userId
        ? { where: { userId, submittedAt: { not: null } }, orderBy: { score: "desc" }, take: 1, select: { score: true, passed: true } }
        : false,
      _count: { select: { enrollments: true } },
    },
  });
  if (certification === null) return null;

  const { modules, enrollments, certificates, examAttempts, _count, ...cert } = certification;

  const withStatus = modules.map((module) => ({
    ...module,
    lessons: module.lessons.map(({ progress, ...lesson }) => ({
      ...lesson,
      status: progress?.[0]?.status ?? "not_started",
      completed: progress?.[0]?.status === "completed",
    })),
  }));
  const unlocked = computeUnlockedModules(withStatus);
  const lessons = withStatus.flatMap((m) => m.lessons);

  return {
    ...cert,
    enrollmentCount: _count.enrollments,
    enrollment: enrollments?.[0] ?? null,
    certificateCode: certificates?.[0]?.code ?? null,
    bestExam: examAttempts?.[0] ?? null,
    totalXp: sum(lessons.map((l) => l.xpReward)),
    lessonCount: lessons.length,
    completedCount: lessons.filter((l) => l.completed).length,
    // Signed-out visitors see the path as a new learner would
    modules: withStatus.map((module, i) => ({ ...module, unlocked: userId === null ? i === 0 : unlocked[i] })),
  };
}

export type CertificationDetail = NonNullable<Awaited<ReturnType<typeof getCertificationDetail>>>;
