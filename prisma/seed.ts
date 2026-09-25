import { readFileSync } from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { badges, certifications } from "./content";
import type { CertificationContent, LessonContent, ModuleContent } from "./content/types";

const prisma = new PrismaClient();
const LESSONS_DIR = path.join(__dirname, "content", "lessons");

const json = (value: unknown) => value as Prisma.InputJsonValue;

function readMarkdown(cert: string, module: string, slug: string): string {
  return readFileSync(path.join(LESSONS_DIR, cert, module, `${slug}.md`), "utf8");
}

async function seedLesson(cert: CertificationContent, module: ModuleContent, moduleId: string, lesson: LessonContent, order: number) {
  // Readings keep their body in Markdown; quizzes and labs use a short intro as the lesson body
  const content = lesson.type === "reading" ? readMarkdown(cert.slug, module.slug, lesson.slug) : lesson.intro;
  const data = { title: lesson.title, type: lesson.type, order, xpReward: lesson.xp, duration: lesson.duration, content };

  const { id: lessonId } = await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId, slug: lesson.slug } },
    update: data,
    create: { ...data, slug: lesson.slug, moduleId },
    select: { id: true },
  });

  if (lesson.type === "quiz") {
    // Stable ids keep learners' attempts and review items when content is re-seeded
    for (const [i, q] of lesson.questions.entries()) {
      const id = `${lessonId}-q${i + 1}`;
      const question = {
        question: q.question,
        type: q.type,
        options: json(q.options),
        correctAnswer: json(q.answer),
        explanation: q.explanation,
        order: i + 1,
        xpReward: q.xp ?? 15,
      };
      await prisma.quizQuestion.upsert({
        where: { id },
        update: question,
        create: { ...question, id, lessonId },
      });
    }
  }

  if (lesson.type === "lab") {
    const lab = {
      instructions: readMarkdown(cert.slug, module.slug, lesson.slug),
      initialState: json(lesson.initialState ?? []),
      checks: json(lesson.checks),
      hints: json(lesson.hints),
      timeLimit: lesson.timeLimit,
    };
    await prisma.labConfig.upsert({
      where: { lessonId },
      update: lab,
      create: { ...lab, lessonId },
    });
  }
}

async function seedCertification(cert: CertificationContent) {
  const data = {
    name: cert.name,
    shortName: cert.shortName,
    description: cert.description,
    icon: cert.icon,
    color: cert.color,
    difficulty: cert.difficulty,
    estimatedHours: cert.estimatedHours,
    order: cert.order,
    examQuestionCount: cert.exam.questions,
    examDurationMinutes: cert.exam.minutes,
    examPassPercent: cert.exam.passPercent,
  };
  const { id: certificationId } = await prisma.certificationPath.upsert({
    where: { slug: cert.slug },
    update: data,
    create: { ...data, slug: cert.slug },
    select: { id: true },
  });

  for (const [i, module] of cert.modules.entries()) {
    const moduleData = { name: module.name, description: module.description, order: i + 1, xpReward: module.xp };
    const { id: moduleId } = await prisma.module.upsert({
      where: { certificationId_slug: { certificationId, slug: module.slug } },
      update: moduleData,
      create: { ...moduleData, slug: module.slug, certificationId },
      select: { id: true },
    });

    for (const [j, lesson] of module.lessons.entries()) {
      await seedLesson(cert, module, moduleId, lesson, j + 1);
    }
  }
}

async function main() {
  console.log("Seeding content...");

  for (const cert of certifications) await seedCertification(cert);

  for (const badge of badges) {
    const data = {
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      category: badge.category,
      requirement: json(badge.requirement),
      xpReward: badge.xp,
    };
    await prisma.badge.upsert({ where: { slug: badge.slug }, update: data, create: { ...data, slug: badge.slug } });
  }

  // Demo account only when explicitly requested, never by default in production
  if (process.env.SEED_DEMO_USER === "true") {
    await prisma.user.upsert({
      where: { email: "demo@kubelearn.dev" },
      update: {},
      create: {
        name: "Demo User",
        email: "demo@kubelearn.dev",
        password: await bcrypt.hash("kubelearn-demo", 12),
      },
    });
    console.log("Demo user: demo@kubelearn.dev / kubelearn-demo");
  }

  const lessonCount = certifications.flatMap((c) => c.modules.flatMap((m) => m.lessons)).length;
  console.log(`Seeded ${certifications.length} paths, ${lessonCount} lessons and ${badges.length} badges.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
