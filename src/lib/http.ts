import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

type ParseResult<T> = { data: T; error?: undefined } | { data?: undefined; error: NextResponse };

export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<ParseResult<z.infer<T>>> {
  const body = await request.json().catch(() => null);
  const result = schema.safeParse(body);

  if (result.success) return { data: result.data };
  return { error: jsonError(result.error.issues[0]?.message ?? "Invalid request", 400) };
}
