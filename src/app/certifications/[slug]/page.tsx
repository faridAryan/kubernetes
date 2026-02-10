"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  Users,
  Zap,
  CheckCircle2,
  Circle,
  PlayCircle,
  Terminal,
  Brain,
  ChevronDown,
  ChevronRight,
  Lock,
  Trophy,
} from "lucide-react";
import { getDifficultyColor, getDifficultyBg, formatDuration } from "@/lib/utils";

interface LessonData {
  id: string;
  slug: string;
  title: string;
  type: string;
  order: number;
  xpReward: number;
  duration: number;
  progress?: { status: string }[];
}

interface ModuleData {
  id: string;
  slug: string;
  name: string;
  description: string;
  order: number;
  xpReward: number;
  lessons: LessonData[];
}

interface CertificationData {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
  difficulty: string;
  totalXp: number;
  estimatedHours: number;
  modules: ModuleData[];
  enrollment: { id: string; progress: number } | null;
  _count: { enrollments: number };
}

export default function CertificationDetailPage() {
  const { slug } = useParams();
  const { data: session } = useSession();
  const router = useRouter();
  const [cert, setCert] = useState<CertificationData | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );
  const [enrolling, setEnrolling] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/certifications/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        setCert(data);
        setLoading(false);
        if (data.modules?.length > 0) {
          setExpandedModules(new Set([data.modules[0].id]));
        }
      });
  }, [slug]);

  const handleEnroll = async () => {
    if (!session) {
      router.push("/login");
      return;
    }
    setEnrolling(true);
    await fetch(`/api/certifications/${slug}/enroll`, { method: "POST" });
    const res = await fetch(`/api/certifications/${slug}`);
    const data = await res.json();
    setCert(data);
    setEnrolling(false);
  };

  const toggleModule = (moduleId: string) => {
    const next = new Set(expandedModules);
    if (next.has(moduleId)) next.delete(moduleId);
    else next.add(moduleId);
    setExpandedModules(next);
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case "reading":
        return <BookOpen size={16} />;
      case "quiz":
        return <Brain size={16} />;
      case "lab":
        return <Terminal size={16} />;
      default:
        return <BookOpen size={16} />;
    }
  };

  const getLessonTypeStyle = (type: string) => {
    switch (type) {
      case "reading":
        return "lesson-type-reading";
      case "quiz":
        return "lesson-type-quiz";
      case "lab":
        return "lesson-type-lab";
      default:
        return "lesson-type-reading";
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-16 w-16 bg-kube-800 rounded-2xl" />
          <div className="h-8 w-64 bg-kube-800 rounded" />
          <div className="h-4 w-full bg-kube-800 rounded" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-kube-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!cert) return null;

  const totalLessons = cert.modules.reduce(
    (sum, m) => sum + m.lessons.length,
    0
  );
  const completedLessons = cert.modules.reduce(
    (sum, m) =>
      sum +
      m.lessons.filter(
        (l) => l.progress && l.progress[0]?.status === "completed"
      ).length,
    0
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="glass-card p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="text-6xl">{cert.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{cert.shortName}</h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyBg(
                  cert.difficulty
                )} ${getDifficultyColor(cert.difficulty)}`}
              >
                {cert.difficulty}
              </span>
            </div>
            <p className="text-kube-400 mb-2">{cert.name}</p>
            <p className="text-kube-300 text-sm mb-6">{cert.description}</p>

            <div className="flex flex-wrap gap-6 text-sm text-kube-400 mb-6">
              <div className="flex items-center gap-1">
                <BookOpen size={16} />
                <span>
                  {cert.modules.length} modules, {totalLessons} lessons
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span>{formatDuration(cert.estimatedHours * 60)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={16} />
                <span>{cert._count.enrollments} enrolled</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap size={16} className="text-accent-yellow" />
                <span>{cert.totalXp} total XP</span>
              </div>
            </div>

            {cert.enrollment ? (
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-kube-300">
                    Progress: {completedLessons}/{totalLessons} lessons
                  </span>
                  <span className="text-kube-400">
                    {Math.round(cert.enrollment.progress)}%
                  </span>
                </div>
                <div className="xp-bar">
                  <div
                    className="xp-bar-fill"
                    style={{ width: `${cert.enrollment.progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="btn-primary flex items-center gap-2"
              >
                <PlayCircle size={18} />
                {enrolling ? "Enrolling..." : "Enroll & Start Learning"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modules */}
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Trophy size={24} className="text-accent-yellow" />
        Learning Path
      </h2>

      <div className="space-y-4">
        {cert.modules.map((module, moduleIdx) => {
          const isExpanded = expandedModules.has(module.id);
          const moduleCompleted = module.lessons.every(
            (l) => l.progress && l.progress[0]?.status === "completed"
          );
          const moduleLessonsCompleted = module.lessons.filter(
            (l) => l.progress && l.progress[0]?.status === "completed"
          ).length;

          return (
            <div key={module.id} className="glass-card overflow-hidden">
              <button
                onClick={() => toggleModule(module.id)}
                className="w-full p-6 flex items-center gap-4 hover:bg-kube-800/30 transition"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    moduleCompleted
                      ? "bg-accent-green/20 text-accent-green"
                      : "bg-kube-800 text-kube-400"
                  }`}
                >
                  {moduleCompleted ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    moduleIdx + 1
                  )}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-white">
                    {module.name}
                  </h3>
                  <p className="text-sm text-kube-400">
                    {module.lessons.length} lessons
                    {moduleLessonsCompleted > 0 &&
                      ` - ${moduleLessonsCompleted}/${module.lessons.length} complete`}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-kube-500">
                  <Zap size={14} className="text-accent-yellow" />
                  <span className="text-xs">{module.xpReward} XP</span>
                  {isExpanded ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 space-y-2">
                  {module.lessons.map((lesson) => {
                    const status =
                      lesson.progress?.[0]?.status || "not_started";
                    const isCompleted = status === "completed";

                    return (
                      <Link
                        key={lesson.id}
                        href={
                          cert.enrollment
                            ? `/learn/${cert.slug}/${module.slug}/${lesson.slug}`
                            : "#"
                        }
                        className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                          cert.enrollment
                            ? "hover:bg-kube-800/50 cursor-pointer"
                            : "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isCompleted
                              ? "bg-accent-green/20 text-accent-green"
                              : status === "in_progress"
                              ? "bg-kube-500/20 text-kube-400"
                              : "bg-kube-800 text-kube-500"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={16} />
                          ) : (
                            <Circle size={16} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${
                                isCompleted ? "text-kube-300" : "text-white"
                              }`}
                            >
                              {lesson.title}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${getLessonTypeStyle(
                                lesson.type
                              )}`}
                            >
                              {getLessonIcon(lesson.type)}
                              {lesson.type}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-kube-500">
                          <span>{formatDuration(lesson.duration)}</span>
                          <span className="flex items-center gap-1">
                            <Zap size={12} className="text-accent-yellow" />
                            {lesson.xpReward}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
