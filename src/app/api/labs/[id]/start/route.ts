import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const labConfig = await prisma.labConfig.findUnique({
    where: { id: params.id },
  });

  if (!labConfig) {
    return NextResponse.json({ error: "Lab not found" }, { status: 404 });
  }

  // Check for existing active session
  const existingSession = await prisma.labSession.findFirst({
    where: {
      userId: session.user.id,
      labConfigId: params.id,
      status: "active",
    },
  });

  if (existingSession) {
    return NextResponse.json(existingSession);
  }

  const labSession = await prisma.labSession.create({
    data: {
      userId: session.user.id,
      labConfigId: params.id,
    },
  });

  return NextResponse.json({
    ...labSession,
    instructions: labConfig.instructions,
    hints: JSON.parse(labConfig.hints),
    timeLimit: labConfig.timeLimit,
  });
}
