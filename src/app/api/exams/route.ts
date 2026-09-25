import { NextResponse } from "next/server";
import { getUserId, jsonError, parseBody } from "@/lib/http";
import { isRateLimited } from "@/lib/rate-limit";
import { startExam } from "@/lib/learning/exam";
import { startExamSchema } from "@/lib/validation/exam";

export async function POST(request: Request) {
  const userId = await getUserId();
  if (userId === null) return jsonError("Unauthorized", 401);

  if (await isRateLimited(`exam:${userId}`, 10, 3600)) {
    return jsonError("Too many exam attempts, try again later", 429);
  }

  const parsed = await parseBody(request, startExamSchema);
  if (parsed.error) return parsed.error;

  const exam = await startExam(userId, parsed.data.certificationSlug);
  if (exam === null) return jsonError("Certification not found", 404);

  return NextResponse.json(exam, { status: 201 });
}
