import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/lib/http";
import { currentStreak } from "@/lib/gamification/streak";

// Lightweight stats for the navbar, so public pages can stay static
export async function GET() {
  const userId = await getUserId();
  if (userId === null) return jsonError("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { level: true, streak: true, lastActiveAt: true },
  });
  if (user === null) return jsonError("User not found", 404);

  return NextResponse.json({ level: user.level, streak: currentStreak(user.streak, user.lastActiveAt) });
}
