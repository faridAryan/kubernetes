import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLessonByPath } from "@/lib/queries/lesson";

export async function GET(
  request: Request,
  {
    params,
  }: { params: { slug: string; moduleSlug: string; lessonSlug: string } }
) {
  const session = await getServerSession(authOptions);
  const lesson = await getLessonByPath(
    params.slug,
    params.moduleSlug,
    params.lessonSlug,
    session?.user?.id
  );

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  return NextResponse.json(lesson);
}
