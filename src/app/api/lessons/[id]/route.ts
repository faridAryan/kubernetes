import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.id },
    include: {
      module: {
        include: {
          certification: true,
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, type: true, order: true, slug: true },
          },
        },
      },
      quizQuestions: {
        orderBy: { order: "asc" },
      },
      labConfig: true,
      progress: session?.user
        ? { where: { userId: session.user.id } }
        : undefined,
    },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  return NextResponse.json(lesson);
}
