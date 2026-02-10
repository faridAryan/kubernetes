import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const certifications = await prisma.certificationPath.findMany({
    orderBy: { order: "asc" },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { lessons: true } },
        },
      },
      _count: {
        select: { enrollments: true },
      },
    },
  });

  return NextResponse.json(certifications);
}
