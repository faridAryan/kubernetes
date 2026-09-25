import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { xp: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      image: true,
      xp: true,
      level: true,
      streak: true,
      _count: {
        select: {
          lessonProgress: { where: { status: "completed" } },
          badges: true,
        },
      },
    },
  });

  return NextResponse.json(users);
}
