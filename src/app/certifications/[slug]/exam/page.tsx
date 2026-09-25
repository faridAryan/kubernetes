import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import ExamView from "@/components/exam/ExamView";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Mock Exam - KubeLearn" };

export default async function ExamPage({ params }: { params: { slug: string } }) {
  const cert = await prisma.certificationPath.findUnique({
    where: { slug: params.slug },
    select: {
      slug: true,
      shortName: true,
      name: true,
      examQuestionCount: true,
      examDurationMinutes: true,
      examPassPercent: true,
    },
  });
  if (cert === null) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href={`/certifications/${cert.slug}`} className="text-sm text-kube-400 hover:text-white flex items-center gap-1 mb-6">
        <ChevronLeft size={14} />
        {cert.shortName}
      </Link>
      <h1 className="text-3xl font-bold text-white mb-6">{cert.shortName} Mock Exam</h1>
      <ExamView
        certificationSlug={cert.slug}
        questionCount={cert.examQuestionCount}
        durationMinutes={cert.examDurationMinutes}
        passPercent={cert.examPassPercent}
      />
    </div>
  );
}
