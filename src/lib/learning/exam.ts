import { AchievementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/gamification/xp";
import { issueCertificateIfEligible } from "./certificate";
import { isCorrectAnswer, shuffle } from "./quiz";

const EXAM_PASS_XP = 200;
const SUBMIT_GRACE_MS = 60_000;

type Answer = string | string[];

const publicQuestionSelect = {
  id: true,
  question: true,
  type: true,
  options: true,
} as const;

// Draws a random set of questions from the path's question bank
export async function startExam(userId: string, certificationSlug: string) {
  const certification = await prisma.certificationPath.findUnique({
    where: { slug: certificationSlug },
    select: { id: true, examQuestionCount: true, examDurationMinutes: true },
  });
  if (certification === null) return null;

  const bank = await prisma.quizQuestion.findMany({
    where: { lesson: { module: { certificationId: certification.id } } },
    select: publicQuestionSelect,
  });

  const questions = shuffle(bank)
    .slice(0, certification.examQuestionCount)
    .map((q) => ({ ...q, options: shuffle(q.options as string[]) }));

  const attempt = await prisma.examAttempt.create({
    data: {
      userId,
      certificationId: certification.id,
      questionIds: questions.map((q) => q.id),
      expiresAt: new Date(Date.now() + certification.examDurationMinutes * 60_000),
    },
    select: { id: true, expiresAt: true },
  });

  return { ...attempt, questions };
}

export async function submitExam(userId: string, attemptId: string, answers: Record<string, Answer>) {
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, userId, submittedAt: null },
    select: {
      questionIds: true,
      expiresAt: true,
      certificationId: true,
      certification: { select: { name: true, examPassPercent: true } },
    },
  });
  if (attempt === null) return null;

  const isLate = Date.now() > attempt.expiresAt.getTime() + SUBMIT_GRACE_MS;
  const questions = await prisma.quizQuestion.findMany({
    where: { id: { in: attempt.questionIds } },
    select: { id: true, question: true, correctAnswer: true, explanation: true },
  });

  // Answers submitted after the time limit don't count
  const results = questions.map((q) => {
    const answer = isLate ? undefined : answers[q.id];
    return {
      id: q.id,
      question: q.question,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      answer: answer ?? null,
      correct: answer === undefined ? false : isCorrectAnswer(q.correctAnswer, answer),
    };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const score = Math.round((correctCount / Math.max(results.length, 1)) * 100);
  const passed = score >= attempt.certification.examPassPercent;

  const certificate = await prisma.$transaction(async (tx) => {
    const alreadyPassed = await tx.examAttempt.count({
      where: { userId, certificationId: attempt.certificationId, passed: true },
    });

    await tx.examAttempt.update({
      where: { id: attemptId },
      data: { answers, score, passed, submittedAt: new Date() },
    });

    if (passed === false) return null;

    if (alreadyPassed === 0) {
      await awardXp(
        tx,
        userId,
        EXAM_PASS_XP,
        AchievementType.exam_passed,
        `Passed the ${attempt.certification.name} mock exam`
      );
    }
    return issueCertificateIfEligible(tx, userId, attempt.certificationId);
  });

  return {
    score,
    passed,
    passPercent: attempt.certification.examPassPercent,
    late: isLate,
    certificateCode: certificate?.code ?? null,
    results,
  };
}
