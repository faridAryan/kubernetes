import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/gamification";

interface ExpectedCommand {
  command: string;
  pattern: string;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { sessionId, commands } = await request.json();

  if (typeof sessionId !== "string" || Array.isArray(commands) === false) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [labSession, previousCompletion] = await Promise.all([
    prisma.labSession.findFirst({
      where: { id: sessionId, userId, labConfigId: params.id, status: "active" },
      select: {
        labConfig: {
          select: {
            validationScript: true,
            lesson: { select: { title: true, xpReward: true } },
          },
        },
      },
    }),
    prisma.labSession.findFirst({
      where: { userId, labConfigId: params.id, status: "completed" },
      select: { id: true },
    }),
  ]);

  if (!labSession) {
    return NextResponse.json(
      { error: "No active lab session" },
      { status: 404 }
    );
  }

  // In a real implementation, this would validate against a running K8s cluster
  // For MVP, we validate based on expected commands/output patterns
  const expectedCommands: ExpectedCommand[] = JSON.parse(
    labSession.labConfig.validationScript
  );
  const userCommands = commands.filter(
    (cmd): cmd is string => typeof cmd === "string"
  );

  const score = expectedCommands.filter((expected) =>
    userCommands.some(
      (cmd) => cmd.includes(expected.command) || cmd.includes(expected.pattern)
    )
  ).length;

  const totalSteps = expectedCommands.length;
  const passed = score >= Math.ceil(totalSteps * 0.7);
  const percentage = Math.round((score / totalSteps) * 100);

  if (passed) {
    const { lesson } = labSession.labConfig;

    await Promise.all([
      prisma.labSession.update({
        where: { id: sessionId },
        data: { status: "completed", completedAt: new Date(), score: percentage },
        select: { id: true },
      }),
      // XP is granted only for the first completed session of this lab
      previousCompletion === null
        ? awardXp(userId, lesson.xpReward, "lab_complete", `Completed lab: ${lesson.title}`)
        : null,
    ]);
  }

  return NextResponse.json({
    passed,
    score: percentage,
    completedSteps: score,
    totalSteps,
    message: passed
      ? "Lab completed successfully!"
      : `You completed ${score}/${totalSteps} steps. Keep trying!`,
  });
}
