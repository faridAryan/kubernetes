import { prisma } from "@/lib/prisma";

// A module unlocks once every lesson of the module before it is completed
export async function isLessonUnlocked(userId: string, lessonId: string): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { order: true, certificationId: true } } },
  });
  if (lesson === null) return false;

  const previousModule = await prisma.module.findFirst({
    where: {
      certificationId: lesson.module.certificationId,
      order: { lt: lesson.module.order },
    },
    orderBy: { order: "desc" },
    select: {
      _count: { select: { lessons: true } },
      lessons: {
        where: { progress: { some: { userId, status: "completed" } } },
        select: { id: true },
      },
    },
  });

  return previousModule === null || previousModule.lessons.length === previousModule._count.lessons;
}

// Unlock state for an ordered list of modules, given which of their lessons are completed
export function computeUnlockedModules(
  modules: { lessons: { completed: boolean }[] }[]
): boolean[] {
  return modules.map(
    (_, i) => i === 0 || modules[i - 1].lessons.every((lesson) => lesson.completed)
  );
}
