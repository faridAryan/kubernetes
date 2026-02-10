import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/gamification";

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certification = await prisma.certificationPath.findUnique({
    where: { slug: params.slug },
  });

  if (!certification) {
    return NextResponse.json(
      { error: "Certification not found" },
      { status: 404 }
    );
  }

  const existing = await prisma.enrollment.findUnique({
    where: {
      userId_certificationId: {
        userId: session.user.id,
        certificationId: certification.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Already enrolled" },
      { status: 400 }
    );
  }

  const enrollment = await prisma.enrollment.create({
    data: {
      userId: session.user.id,
      certificationId: certification.id,
    },
  });

  await awardXp(
    session.user.id,
    25,
    "enrollment",
    `Enrolled in ${certification.name}`
  );

  return NextResponse.json(enrollment);
}
