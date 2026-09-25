import { prisma } from "@/lib/prisma";
import { shuffle } from "@/lib/learning/quiz";
import { isLessonUnlocked } from "@/lib/learning/unlock";

// Public lesson shape: never exposes quiz answers or lab checks
export async function getLessonPage(
  certSlug: string,
  moduleSlug: string,
  lessonSlug: string,
  userId: string
) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      slug: lessonSlug,
      module: { slug: moduleSlug, certification: { slug: certSlug } },
    },
    select: {
      id: true,
      title: true,
      content: true,
      type: true,
      xpReward: true,
      duration: true,
      module: {
        select: {
          name: true,
          certification: { select: { shortName: true } },
          lessons: { orderBy: { order: "asc" }, select: { slug: true } },
        },
      },
      quizQuestions: {
        orderBy: { order: "asc" },
        select: { id: true, question: true, type: true, options: true, explanation: true, xpReward: true },
      },
      labConfig: { select: { id: true, instructions: true, hints: true, timeLimit: true } },
      progress: { where: { userId }, select: { status: true } },
    },
  });
  if (lesson === null) return null;

  const { module, progress, quizQuestions, labConfig, ...rest } = lesson;
  const index = module.lessons.findIndex((l) => l.slug === lessonSlug);

  return {
    ...rest,
    moduleName: module.name,
    certificationShortName: module.certification.shortName,
    completed: progress[0]?.status === "completed",
    unlocked: await isLessonUnlocked(userId, lesson.id),
    previousSlug: module.lessons[index - 1]?.slug ?? null,
    nextSlug: module.lessons[index + 1]?.slug ?? null,
    quizQuestions: quizQuestions.map((q) => ({
      ...q,
      options: q.type === "true_false" ? (q.options as string[]) : shuffle(q.options as string[]),
    })),
    labConfig: labConfig && { ...labConfig, hints: labConfig.hints as string[] },
  };
}

export type LessonPageData = NonNullable<Awaited<ReturnType<typeof getLessonPage>>>;
export type PublicQuestion = LessonPageData["quizQuestions"][number];
