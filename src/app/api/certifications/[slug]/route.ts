import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);

  const certification = await prisma.certificationPath.findUnique({
    where: { slug: params.slug },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: session?.user
              ? {
                  progress: {
                    where: { userId: session.user.id },
                  },
                }
              : undefined,
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!certification) {
    return NextResponse.json(
      { error: "Certification not found" },
      { status: 404 }
    );
  }

  let enrollment = null;
  if (session?.user) {
    enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_certificationId: {
          userId: session.user.id,
          certificationId: certification.id,
        },
      },
    });
  }

  return NextResponse.json({ ...certification, enrollment });
}
