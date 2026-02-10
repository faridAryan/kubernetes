import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      enrollments: {
        include: { certification: true },
      },
      badges: {
        include: { badge: true },
      },
      achievements: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      _count: {
        select: {
          lessonProgress: { where: { status: "completed" } },
          quizAttempts: { where: { correct: true } },
          labSessions: { where: { status: "completed" } },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { password: _, ...userWithoutPassword } = user;
  return NextResponse.json(userWithoutPassword);
}
