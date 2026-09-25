import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const certification = await prisma.certificationPath.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      slug: true,
      name: true,
      shortName: true,
      description: true,
      icon: true,
      color: true,
      difficulty: true,
      totalXp: true,
      estimatedHours: true,
      modules: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          order: true,
          xpReward: true,
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              slug: true,
              title: true,
              type: true,
              order: true,
              xpReward: true,
              duration: true,
              progress: userId
                ? { where: { userId }, select: { status: true } }
                : false,
            },
          },
        },
      },
      // Fetch the user's enrollment in the same query instead of a second round trip
      enrollments: userId
        ? { where: { userId }, select: { id: true, progress: true } }
        : false,
      _count: { select: { enrollments: true } },
    },
  });

  if (!certification) {
    return NextResponse.json(
      { error: "Certification not found" },
      { status: 404 }
    );
  }

  const { enrollments, ...rest } = certification;
  return NextResponse.json({ ...rest, enrollment: enrollments?.[0] ?? null });
}
