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

  const userId = session.user.id;

  const [labConfig, existingSession] = await Promise.all([
    prisma.labConfig.findUnique({
      where: { id: params.id },
      select: { id: true },
    }),
    prisma.labSession.findFirst({
      where: { userId, labConfigId: params.id, status: "active" },
    }),
  ]);

  if (!labConfig) {
    return NextResponse.json({ error: "Lab not found" }, { status: 404 });
  }

  // Reuse the active session so reloading the lab doesn't create duplicates
  const labSession =
    existingSession ??
    (await prisma.labSession.create({
      data: { userId, labConfigId: params.id },
    }));

  return NextResponse.json(labSession);
}
