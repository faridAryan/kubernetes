import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BookOpen, Clock, FileCheck, Trophy, Users, Zap } from "lucide-react";
import EnrollButton from "@/components/certifications/EnrollButton";
import ModuleList from "@/components/certifications/ModuleList";
import { getUserId } from "@/lib/http";
import { getCertificationDetail } from "@/lib/queries/certifications";
import { formatDuration, getDifficultyBg, getDifficultyColor } from "@/lib/utils";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cert = await getCertificationDetail(params.slug, null);
  return cert
    ? { title: `${cert.shortName}: ${cert.name} - KubeLearn`, description: cert.description }
    : { title: "Certification not found - KubeLearn" };
}

export default async function CertificationDetailPage({ params }: Props) {
  const userId = await getUserId();
  const cert = await getCertificationDetail(params.slug, userId);
  if (cert === null) notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="glass-card p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="text-6xl">{cert.icon}</div>
          <div className="flex-1 w-full">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{cert.shortName}</h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyBg(cert.difficulty)} ${getDifficultyColor(cert.difficulty)}`}
              >
                {cert.difficulty}
              </span>
            </div>
            <p className="text-kube-400 mb-2">{cert.name}</p>
            <p className="text-kube-300 text-sm mb-6">{cert.description}</p>

            <div className="flex flex-wrap gap-6 text-sm text-kube-400 mb-6">
              <span className="flex items-center gap-1">
                <BookOpen size={16} />
                {cert.modules.length} modules, {cert.lessonCount} lessons
              </span>
              <span className="flex items-center gap-1">
                <Clock size={16} />
                {formatDuration(cert.estimatedHours * 60)}
              </span>
              <span className="flex items-center gap-1">
                <Users size={16} />
                {cert.enrollmentCount} enrolled
              </span>
              <span className="flex items-center gap-1">
                <Zap size={16} className="text-accent-yellow" />
                {cert.totalXp} total XP
              </span>
            </div>

            {cert.enrollment ? (
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-kube-300">
                    Progress: {cert.completedCount}/{cert.lessonCount} lessons
                  </span>
                  <span className="text-kube-400">{Math.round(cert.enrollment.progress)}%</span>
                </div>
                <div className="xp-bar">
                  <div className="xp-bar-fill" style={{ width: `${cert.enrollment.progress}%` }} />
                </div>
              </div>
            ) : (
              <EnrollButton slug={cert.slug} signedIn={userId !== null} />
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-6 mb-8 flex flex-col sm:flex-row sm:items-center gap-4">
        <FileCheck size={32} className="text-accent-purple shrink-0" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">Mock exam</h2>
          <p className="text-sm text-kube-400">
            {cert.examQuestionCount} questions in {cert.examDurationMinutes} minutes, pass mark {cert.examPassPercent}%.
            {cert.bestExam && ` Your best score: ${cert.bestExam.score}%.`}
          </p>
        </div>
        {cert.certificateCode ? (
          <Link href={`/certificates/${cert.certificateCode}`} className="btn-primary flex items-center gap-2">
            <Award size={16} />
            Your certificate
          </Link>
        ) : (
          <Link href={`/certifications/${cert.slug}/exam`} className="btn-secondary">
            Take the mock exam
          </Link>
        )}
      </div>

      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Trophy size={24} className="text-accent-yellow" />
        Learning Path
      </h2>
      <ModuleList certSlug={cert.slug} modules={cert.modules} />
    </div>
  );
}
