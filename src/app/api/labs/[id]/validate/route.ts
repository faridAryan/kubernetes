import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/gamification";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId, commands } = await request.json();

  const labSession = await prisma.labSession.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id,
      status: "active",
    },
    include: {
      labConfig: {
        include: { lesson: true },
      },
    },
  });

  if (!labSession) {
    return NextResponse.json(
      { error: "No active lab session" },
      { status: 404 }
    );
  }

  // In a real implementation, this would validate against a running K8s cluster
  // For MVP, we validate based on expected commands/output patterns
  const validationScript = labSession.labConfig.validationScript;
  const expectedCommands = JSON.parse(validationScript);

  let score = 0;
  const totalSteps = expectedCommands.length;

  for (const expected of expectedCommands) {
    if (
      commands.some(
        (cmd: string) =>
          cmd.includes(expected.command) || cmd.includes(expected.pattern)
      )
    ) {
      score++;
    }
  }

  const passed = score >= Math.ceil(totalSteps * 0.7);
  const percentage = Math.round((score / totalSteps) * 100);

  if (passed) {
    await prisma.labSession.update({
      where: { id: sessionId },
      data: { status: "completed", completedAt: new Date(), score: percentage },
    });

    await awardXp(
      session.user.id,
      labSession.labConfig.lesson.xpReward,
      "lab_complete",
      `Completed lab: ${labSession.labConfig.lesson.title}`
    );
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
