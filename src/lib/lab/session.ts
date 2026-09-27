import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { completeLesson } from "@/lib/learning/progress";
import { isLessonUnlocked } from "@/lib/learning/unlock";
import { runChecks } from "./checks";
import { createInitialState } from "./initial-state";
import { executeCommand } from "./kubectl";
import type { CheckResult, ClusterState, LabCheck, ResourceSeed } from "./types";

const MAX_COMMANDS = 500;
// Failed validations before the solution can be revealed
const ATTEMPTS_BEFORE_SOLUTION = 2;

export interface LabSolution {
  explanation: string;
  commands: string[];
  files?: Record<string, string>;
}

type LabResult<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

const fail = (error: string, status: number) => ({ ok: false, error, status }) as const;

// Resumes the active session or starts a fresh cluster
export async function startLab(
  userId: string,
  labConfigId: string
): Promise<LabResult<{ id: string; expiresAt: Date; commands: string[]; files: Record<string, string> }>> {
  const labConfig = await prisma.labConfig.findUnique({
    where: { id: labConfigId },
    select: { lessonId: true, initialState: true, timeLimit: true },
  });
  if (labConfig === null) return fail("Lab not found", 404);

  const unlocked = await isLessonUnlocked(userId, labConfig.lessonId);
  if (unlocked === false) return fail("Complete the previous module first", 403);

  const select = { id: true, expiresAt: true, commands: true, state: true } as const;
  // Only the saved manifests go back to the browser, never the cluster state itself
  const toClient = ({ state, ...session }: { id: string; expiresAt: Date; commands: string[]; state: Prisma.JsonValue }) => ({
    ...session,
    files: (state as unknown as ClusterState).files ?? {},
  });
  const active = await prisma.labSession.findFirst({
    where: { userId, labConfigId, status: "active", expiresAt: { gt: new Date() } },
    orderBy: { startedAt: "desc" },
    select,
  });
  if (active) return { ok: true, value: toClient(active) };

  const session = await prisma.labSession.create({
    data: {
      userId,
      labConfigId,
      state: createInitialState(labConfig.initialState as unknown as ResourceSeed[]) as unknown as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + labConfig.timeLimit * 60_000),
    },
    select,
  });
  return { ok: true, value: toClient(session) };
}

async function getActiveSession(userId: string, sessionId: string) {
  const session = await prisma.labSession.findFirst({
    where: { id: sessionId, userId },
    select: {
      status: true,
      expiresAt: true,
      state: true,
      commands: true,
      solutionViewed: true,
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

const MAX_FILES = 20;
const MAX_FILE_LENGTH = 20_000;

export async function runLabCommand(
  userId: string,
  sessionId: string,
  command: string,
  files: Record<string, string> = {}
): Promise<LabResult<{ output: string; isError: boolean; files: string[]; savedFiles: Record<string, string> }>> {
  const result = await getActiveSession(userId, sessionId);
  if (result.ok === false) return result;

  if (result.value.commands.length >= MAX_COMMANDS) {
    return fail("Command limit reached for this session", 429);
  }

  // Save editor files into the session's virtual filesystem before running the command
  const current = result.value.state as unknown as ClusterState;
  const mergedFiles = { ...(current.files ?? {}), ...files };
  if (Object.keys(mergedFiles).length > MAX_FILES) return fail(`A lab session can hold at most ${MAX_FILES} files`, 400);

  const exec = executeCommand({ ...current, files: mergedFiles }, command);

  // Files written by the command itself ("kubectl get deploy web -o yaml > web.yaml") obey the same limits
  const resultFiles = exec.state.files ?? {};
  if (Object.keys(resultFiles).length > MAX_FILES) return fail(`A lab session can hold at most ${MAX_FILES} files`, 400);
  if (Object.values(resultFiles).some((content) => content.length > MAX_FILE_LENGTH)) {
    return fail(`Files are limited to ${MAX_FILE_LENGTH} characters`, 400);
  }

  await prisma.labSession.update({
    where: { id: sessionId },
    data: {
      state: exec.state as unknown as Prisma.InputJsonValue,
      commands: { push: command },
    },
  });
  const savedFiles = Object.fromEntries(
    Object.entries(resultFiles).filter(([name, content]) => mergedFiles[name] !== content)
  );

  return {
    ok: true,
    value: { output: exec.output, isError: exec.isError, files: Object.keys(resultFiles), savedFiles },
  };
}

export async function validateLab(
  userId: string,
  sessionId: string
): Promise<LabResult<{ passed: boolean; score: number; checks: CheckResult[]; solutionAvailable: boolean }>> {
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
    await completeLesson(userId, session.labConfig.lessonId, score, session.solutionViewed ? 0.5 : 1);
    return { ok: true, value: { passed, score, checks, solutionAvailable: true } };
  }

  const updated = await prisma.labSession.update({
    where: { id: sessionId },
    data: { failedValidations: { increment: 1 } },
    select: { failedValidations: true },
  });
  return {
    ok: true,
    value: { passed, score, checks, solutionAvailable: updated.failedValidations >= ATTEMPTS_BEFORE_SOLUTION },
  };
}

// The solution unlocks after a few honest attempts, when time runs out, or once the lab is done
export async function revealSolution(userId: string, sessionId: string): Promise<LabResult<LabSolution>> {
  const session = await prisma.labSession.findFirst({
    where: { id: sessionId, userId },
    select: {
      status: true,
      expiresAt: true,
      failedValidations: true,
      labConfig: {
        select: {
          solution: true,
          lesson: { select: { progress: { where: { userId }, select: { status: true } } } },
        },
      },
    },
  });
  if (session === null) return fail("Lab session not found", 404);

  const alreadyCompleted = session.labConfig.lesson.progress[0]?.status === "completed";
  const timeUp = session.status === "expired" || session.expiresAt.getTime() < Date.now();
  const earned = session.failedValidations >= ATTEMPTS_BEFORE_SOLUTION;

  if (alreadyCompleted === false && timeUp === false && earned === false) {
    return fail(`Validate at least ${ATTEMPTS_BEFORE_SOLUTION} times before revealing the solution`, 403);
  }

  // Seeing the answer before finishing halves the XP for this lab
  if (alreadyCompleted === false && session.status === "active") {
    await prisma.labSession.update({ where: { id: sessionId }, data: { solutionViewed: true } });
  }
  return { ok: true, value: session.labConfig.solution as unknown as LabSolution };
}
