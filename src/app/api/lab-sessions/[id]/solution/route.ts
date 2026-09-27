import { NextResponse } from "next/server";
import { getUserId, jsonError } from "@/lib/http";
import { revealSolution } from "@/lib/lab/session";

// POST because revealing the solution is recorded (it halves the lab's XP)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId();
  if (userId === null) return jsonError("Unauthorized", 401);

  const result = await revealSolution(userId, params.id);
  if (result.ok === false) return jsonError(result.error, result.status);

  return NextResponse.json(result.value);
}
