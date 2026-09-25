import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody } from "@/lib/http";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const ip = getClientIp(request.headers.get("x-forwarded-for"));
  if (await isRateLimited(`register:${ip}`, 5, 3600)) {
    return jsonError("Too many sign-ups from this address. Try again later.", 429);
  }

  const parsed = await parseBody(request, registerSchema);
  if (parsed.error) return parsed.error;

  const { name, email, password } = parsed.data;

  try {
    const user = await prisma.user.create({
      data: { name, email, password: await bcrypt.hash(password, 12) },
      select: { id: true, name: true, email: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (isDuplicate) return jsonError("Email already registered", 400);
    throw error;
  }
}
