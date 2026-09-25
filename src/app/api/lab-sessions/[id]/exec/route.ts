import { NextResponse } from "next/server";
import { getUserId, jsonError, parseBody } from "@/lib/http";
import { isRateLimited } from "@/lib/rate-limit";
import { runLabCommand } from "@/lib/lab/session";
import { execSchema } from "@/lib/validation/lab";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId();
  if (userId === null) return jsonError("Unauthorized", 401);

  if (await isRateLimited(`lab:${userId}`, 120, 60)) {
    return jsonError("Too many commands, slow down", 429);
  }

  const parsed = await parseBody(request, execSchema);
  if (parsed.error) return parsed.error;

  const result = await runLabCommand(userId, params.id, parsed.data.command);
  if (result.ok === false) return jsonError(result.error, result.status);

  return NextResponse.json(result.value);
}
