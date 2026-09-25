import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

export async function GET() {
  const certifications = await prisma.certificationPath.findMany({
    orderBy: { order: "asc" },
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
          name: true,
          _count: { select: { lessons: true } },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });

  return NextResponse.json(certifications);
}
