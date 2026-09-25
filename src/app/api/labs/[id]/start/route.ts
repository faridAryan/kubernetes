import { NextResponse } from "next/server";
import { getUserId, jsonError } from "@/lib/http";
import { startLab } from "@/lib/lab/session";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId();
  if (userId === null) return jsonError("Unauthorized", 401);

  const result = await startLab(userId, params.id);
  if (result.ok === false) return jsonError(result.error, result.status);

  return NextResponse.json(result.value);
}
