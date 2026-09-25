import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
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

  const userId = session.user.id;

  const certification = await prisma.certificationPath.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true },
  });

  if (!certification) {
    return NextResponse.json(
      { error: "Certification not found" },
      { status: 404 }
    );
  }

  try {
    // The unique (userId, certificationId) constraint rejects duplicates, no pre-check query needed
    const enrollment = await prisma.enrollment.create({
      data: { userId, certificationId: certification.id },
    });

    await awardXp(userId, 25, "enrollment", `Enrolled in ${certification.name}`);

    return NextResponse.json(enrollment);
  } catch (error) {
    const isDuplicate =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";

    if (isDuplicate) {
      return NextResponse.json({ error: "Already enrolled" }, { status: 400 });
    }
    throw error;
  }
}
