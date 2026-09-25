import { NextResponse } from "next/server";
import { getUserId, jsonError, parseBody } from "@/lib/http";
import { submitExam } from "@/lib/learning/exam";
import { submitExamSchema } from "@/lib/validation/exam";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId();
  if (userId === null) return jsonError("Unauthorized", 401);

  const parsed = await parseBody(request, submitExamSchema);
  if (parsed.error) return parsed.error;

  const result = await submitExam(userId, params.id, parsed.data.answers);
  if (result === null) return jsonError("Exam not found or already submitted", 404);

  return NextResponse.json(result);
}
