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
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      xp: true,
      level: true,
      streak: true,
      longestStreak: true,
      enrollments: {
        select: {
          id: true,
          progress: true,
          certification: {
            select: { slug: true, shortName: true, name: true, icon: true, color: true },
          },
        },
      },
      badges: {
        select: {
          earnedAt: true,
          badge: {
            select: { name: true, icon: true, description: true, category: true },
          },
        },
      },
      achievements: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, type: true, description: true, xpEarned: true, createdAt: true },
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

  return NextResponse.json(user);
}
