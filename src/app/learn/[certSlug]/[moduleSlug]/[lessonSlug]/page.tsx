"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  Brain,
  Terminal,
  Zap,
  Clock,
} from "lucide-react";
import QuizView from "@/components/quiz/QuizView";
import LabView from "@/components/lab/LabView";
import MarkdownRenderer from "@/components/lesson/MarkdownRenderer";
import { formatDuration } from "@/lib/utils";

interface QuizQuestion {
  id: string;
  question: string;
  type: string;
  options: string;
  explanation: string;
  order: number;
  xpReward: number;
}

interface LabConfig {
  id: string;
  instructions: string;
  hints: string;
  timeLimit: number;
}

interface LessonDetail {
  id: string;
  slug: string;
  title: string;
  content: string;
  type: string;
  order: number;
  xpReward: number;
  duration: number;
  quizQuestions: QuizQuestion[];
  labConfig: LabConfig | null;
  progress?: { status: string }[];
  module: {
    id: string;
    slug: string;
    name: string;
    certification: { slug: string; shortName: string };
    lessons: {
      id: string;
      title: string;
      type: string;
      order: number;
      slug: string;
    }[];
  };
}

export default function LessonPage() {
  const { certSlug, moduleSlug, lessonSlug } = useParams();
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    fetch(
      `/api/certifications/${certSlug}/modules/${moduleSlug}/lessons/${lessonSlug}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setLesson(data);
        setLoading(false);
      });
  }, [certSlug, moduleSlug, lessonSlug]);

  const markComplete = async () => {
    if (!lesson) return;
    setCompleting(true);
    await fetch(`/api/lessons/${lesson.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    setCompleting(false);

    // Navigate to next lesson
    if (lesson.module.lessons) {
      const currentIdx = lesson.module.lessons.findIndex(
        (l) => l.slug === lessonSlug
      );
      const next = lesson.module.lessons[currentIdx + 1];
      if (next) {
        router.push(`/learn/${certSlug}/${moduleSlug}/${next.slug}`);
      } else {
        router.push(`/certifications/${certSlug}`);
      }
    }
  };

  const isCompleted = lesson?.progress?.[0]?.status === "completed";

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-8 w-64 bg-kube-800 rounded mb-4" />
        <div className="h-4 w-full bg-kube-800 rounded mb-2" />
        <div className="h-4 w-3/4 bg-kube-800 rounded mb-2" />
        <div className="h-4 w-1/2 bg-kube-800 rounded" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">
          Lesson not found
        </h1>
        <Link href={`/certifications/${certSlug}`} className="btn-primary">
          Back to certification
        </Link>
      </div>
    );
  }

  const currentIdx = lesson.module.lessons.findIndex(
    (l) => l.slug === lessonSlug
  );
  const prevLesson = lesson.module.lessons[currentIdx - 1];
  const nextLesson = lesson.module.lessons[currentIdx + 1];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-kube-400 mb-6">
        <Link
          href={`/certifications/${certSlug}`}
          className="hover:text-white transition"
        >
          {lesson.module.certification.shortName}
        </Link>
        <ChevronRight size={14} />
        <span className="text-kube-300">{lesson.module.name}</span>
        <ChevronRight size={14} />
        <span className="text-white">{lesson.title}</span>
      </div>

      {/* Lesson Header */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {lesson.type === "reading" && (
                <BookOpen size={20} className="text-kube-400" />
              )}
              {lesson.type === "quiz" && (
                <Brain size={20} className="text-accent-purple" />
              )}
              {lesson.type === "lab" && (
                <Terminal size={20} className="text-accent-green" />
              )}
              <h1 className="text-2xl font-bold text-white">{lesson.title}</h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-kube-400">
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {formatDuration(lesson.duration)}
              </span>
              <span className="flex items-center gap-1">
                <Zap size={14} className="text-accent-yellow" />
                {lesson.xpReward} XP
              </span>
              <span className={`capitalize px-2 py-0.5 rounded-full text-xs border lesson-type-${lesson.type}`}>
                {lesson.type}
              </span>
            </div>
          </div>
          {isCompleted && (
            <div className="flex items-center gap-2 text-accent-green bg-accent-green/10 px-3 py-1.5 rounded-lg">
              <CheckCircle2 size={16} />
              <span className="text-sm font-medium">Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Lesson Content */}
      {lesson.type === "reading" && (
        <div className="glass-card p-8 mb-8">
          <MarkdownRenderer content={lesson.content} />
        </div>
      )}

      {lesson.type === "quiz" && (
        <QuizView
          questions={lesson.quizQuestions}
          lessonId={lesson.id}
          onComplete={markComplete}
        />
      )}

      {lesson.type === "lab" && lesson.labConfig && (
        <LabView
          labConfig={lesson.labConfig}
          lessonContent={lesson.content}
          onComplete={markComplete}
        />
      )}

      {/* Complete button for reading lessons */}
      {lesson.type === "reading" && !isCompleted && (
        <div className="text-center mb-8">
          <button
            onClick={markComplete}
            disabled={completing}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            <CheckCircle2 size={18} />
            {completing ? "Marking complete..." : "Mark as Complete"}
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        {prevLesson ? (
          <Link
            href={`/learn/${certSlug}/${moduleSlug}/${prevLesson.slug}`}
            className="btn-secondary flex items-center gap-2"
          >
            <ChevronLeft size={18} />
            Previous
          </Link>
        ) : (
          <div />
        )}
        {nextLesson ? (
          <Link
            href={`/learn/${certSlug}/${moduleSlug}/${nextLesson.slug}`}
            className="btn-primary flex items-center gap-2"
          >
            Next Lesson
            <ChevronRight size={18} />
          </Link>
        ) : (
          <Link
            href={`/certifications/${certSlug}`}
            className="btn-primary flex items-center gap-2"
          >
            Back to Path
            <ChevronRight size={18} />
          </Link>
        )}
      </div>
    </div>
  );
}
