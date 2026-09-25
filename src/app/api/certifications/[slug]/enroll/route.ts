import { NextResponse } from "next/server";
import { AchievementType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/lib/http";
import { awardXp } from "@/lib/gamification/xp";

const ENROLL_XP = 25;

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const userId = await getUserId();
  if (userId === null) return jsonError("Unauthorized", 401);

  const certification = await prisma.certificationPath.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true },
  });
  if (certification === null) return jsonError("Certification not found", 404);

  try {
    const enrollment = await prisma.$transaction(async (tx) => {
      // The unique (userId, certificationId) constraint rejects duplicates
      const created = await tx.enrollment.create({
        data: { userId, certificationId: certification.id },
      });
      await awardXp(tx, userId, ENROLL_XP, AchievementType.enrollment, `Enrolled in ${certification.name}`);
      return created;
    });
    return NextResponse.json(enrollment, { status: 201 });
  } catch (error) {
    const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (isDuplicate) return jsonError("Already enrolled", 400);
    throw error;
  }
}
