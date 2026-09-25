import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Public lesson shape: never exposes quiz answers or lab validation/init scripts
function lessonSelect(userId?: string) {
  return {
    id: true,
    slug: true,
    title: true,
    content: true,
    type: true,
    order: true,
    xpReward: true,
    duration: true,
    module: {
      select: {
        id: true,
        slug: true,
        name: true,
        certification: { select: { slug: true, shortName: true } },
        lessons: {
          orderBy: { order: "asc" },
          select: { id: true, title: true, type: true, order: true, slug: true },
        },
      },
    },
    quizQuestions: {
      orderBy: { order: "asc" },
      select: {
        id: true,
        question: true,
        type: true,
        options: true,
        explanation: true,
        order: true,
        xpReward: true,
      },
    },
    labConfig: {
      select: { id: true, instructions: true, hints: true, timeLimit: true },
    },
    progress: userId
      ? { where: { userId }, select: { status: true } }
      : false,
  } satisfies Prisma.LessonSelect;
}

export function getLessonById(id: string, userId?: string) {
  return prisma.lesson.findUnique({
    where: { id },
    select: lessonSelect(userId),
  });
}

export function getLessonByPath(
  certSlug: string,
  moduleSlug: string,
  lessonSlug: string,
  userId?: string
) {
  return prisma.lesson.findFirst({
    where: {
      slug: lessonSlug,
      module: { slug: moduleSlug, certification: { slug: certSlug } },
    },
    select: lessonSelect(userId),
  });
}
