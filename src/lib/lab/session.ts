import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { completeLesson } from "@/lib/learning/progress";
import { isLessonUnlocked } from "@/lib/learning/unlock";
import { runChecks } from "./checks";
import { createInitialState } from "./cluster";
import { executeCommand } from "./kubectl";
import type { CheckResult, ClusterState, LabCheck, ResourceSeed } from "./types";

const MAX_COMMANDS = 500;

type LabResult<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

const fail = (error: string, status: number) => ({ ok: false, error, status }) as const;

// Resumes the active session or starts a fresh cluster
export async function startLab(
  userId: string,
  labConfigId: string
): Promise<LabResult<{ id: string; expiresAt: Date; commands: string[] }>> {
  const labConfig = await prisma.labConfig.findUnique({
    where: { id: labConfigId },
    select: { lessonId: true, initialState: true, timeLimit: true },
  });
  if (labConfig === null) return fail("Lab not found", 404);

  const unlocked = await isLessonUnlocked(userId, labConfig.lessonId);
  if (unlocked === false) return fail("Complete the previous module first", 403);

  const select = { id: true, expiresAt: true, commands: true } as const;
  const active = await prisma.labSession.findFirst({
    where: { userId, labConfigId, status: "active", expiresAt: { gt: new Date() } },
    orderBy: { startedAt: "desc" },
    select,
  });
  if (active) return { ok: true, value: active };

  const session = await prisma.labSession.create({
    data: {
      userId,
      labConfigId,
      state: createInitialState(labConfig.initialState as unknown as ResourceSeed[]) as unknown as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + labConfig.timeLimit * 60_000),
    },
    select,
  });
  return { ok: true, value: session };
}

async function getActiveSession(userId: string, sessionId: string) {
  const session = await prisma.labSession.findFirst({
    where: { id: sessionId, userId },
    select: {
      status: true,
      expiresAt: true,
      state: true,
      commands: true,
      labConfig: { select: { lessonId: true, checks: true } },
    },
  });
  if (session === null) return fail("Lab session not found", 404);
  if (session.status !== "active") return fail("This lab session has ended", 410);

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.labSession.update({ where: { id: sessionId }, data: { status: "expired" } });
    return fail("Time is up. Restart the lab to try again.", 410);
  }
  return { ok: true, value: session } as const;
}

export async function runLabCommand(
  userId: string,
  sessionId: string,
  command: string
): Promise<LabResult<{ output: string; isError: boolean }>> {
  const result = await getActiveSession(userId, sessionId);
  if (result.ok === false) return result;

  if (result.value.commands.length >= MAX_COMMANDS) {
    return fail("Command limit reached for this session", 429);
  }

  const exec = executeCommand(result.value.state as unknown as ClusterState, command);
  await prisma.labSession.update({
    where: { id: sessionId },
    data: {
      state: exec.state as unknown as Prisma.InputJsonValue,
      commands: { push: command },
    },
  });

  return { ok: true, value: { output: exec.output, isError: exec.isError } };
}

export async function validateLab(
  userId: string,
  sessionId: string
): Promise<LabResult<{ passed: boolean; score: number; checks: CheckResult[] }>> {
  const result = await getActiveSession(userId, sessionId);
  if (result.ok === false) return result;

  const session = result.value;
  const checks = runChecks(
    session.labConfig.checks as unknown as LabCheck[],
    session.state as unknown as ClusterState,
    session.commands
  );
  const passedCount = checks.filter((check) => check.passed).length;
  const score = Math.round((passedCount / Math.max(checks.length, 1)) * 100);
  const passed = passedCount === checks.length;

  if (passed) {
    await prisma.labSession.update({
      where: { id: sessionId },
      data: { status: "completed", completedAt: new Date(), score },
    });
    await completeLesson(userId, session.labConfig.lessonId, score);
  }

  return { ok: true, value: { passed, score, checks } };
}
