import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookOpen, Brain, CheckCircle2, ChevronLeft, ChevronRight, Clock, Lock, Terminal, Zap } from "lucide-react";
import LabView from "@/components/lab/LabView";
import CompleteLessonButton from "@/components/lesson/CompleteLessonButton";
import Markdown from "@/components/lesson/Markdown";
import QuizView from "@/components/quiz/QuizView";
import { getUserId } from "@/lib/http";
import { getLessonPage } from "@/lib/queries/lesson";
import { formatDuration } from "@/lib/utils";

interface Props {
  params: { certSlug: string; moduleSlug: string; lessonSlug: string };
}

export const metadata: Metadata = { title: "Lesson - KubeLearn" };

const TYPE_ICONS = {
  reading: <BookOpen size={20} className="text-kube-400" />,
  quiz: <Brain size={20} className="text-accent-purple" />,
  lab: <Terminal size={20} className="text-accent-green" />,
};

export default async function LessonPage({ params }: Props) {
  const { certSlug, moduleSlug, lessonSlug } = params;
  const userId = await getUserId();
  if (userId === null) redirect("/login");

  const lesson = await getLessonPage(certSlug, moduleSlug, lessonSlug, userId);
  if (lesson === null) notFound();

  const pathHref = `/certifications/${certSlug}`;
  const lessonHref = (slug: string) => `/learn/${certSlug}/${moduleSlug}/${slug}`;
  const nextHref = lesson.nextSlug ? lessonHref(lesson.nextSlug) : pathHref;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-kube-400 mb-6" aria-label="Breadcrumb">
        <Link href={pathHref} className="hover:text-white transition">
          {lesson.certificationShortName}
        </Link>
        <ChevronRight size={14} />
        <span className="text-kube-300">{lesson.moduleName}</span>
        <ChevronRight size={14} />
        <span className="text-white">{lesson.title}</span>
      </nav>

      <div className="glass-card p-6 mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {TYPE_ICONS[lesson.type]}
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
          {lesson.completed && (
            <div className="flex items-center gap-2 text-accent-green bg-accent-green/10 px-3 py-1.5 rounded-lg">
              <CheckCircle2 size={16} />
              <span className="text-sm font-medium">Completed</span>
            </div>
          )}
        </div>
      </div>

      {lesson.unlocked === false && (
        <div className="glass-card p-8 mb-8 text-center">
          <Lock size={40} className="mx-auto text-kube-500 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">This module is locked</h2>
          <p className="text-kube-400 mb-6">Finish every lesson in the previous module to unlock it.</p>
          <Link href={pathHref} className="btn-primary">
            Back to the path
          </Link>
        </div>
      )}

      {lesson.unlocked && lesson.type === "reading" && (
        <>
          <div className="glass-card p-8 mb-8">
            <Markdown content={lesson.content} />
          </div>
          {lesson.completed === false && <CompleteLessonButton lessonId={lesson.id} nextHref={nextHref} />}
        </>
      )}

      {lesson.unlocked && lesson.type === "quiz" && (
        <QuizView
          questions={lesson.quizQuestions}
          lessonId={lesson.id}
          continueHref={nextHref}
          continueLabel={lesson.nextSlug ? "Next lesson" : "Back to path"}
        />
      )}

      {lesson.unlocked && lesson.type === "lab" && lesson.labConfig && (
        <LabView
          labConfigId={lesson.labConfig.id}
          hints={lesson.labConfig.hints}
          timeLimit={lesson.labConfig.timeLimit}
          instructions={<Markdown content={lesson.labConfig.instructions} />}
          background={lesson.content ? <Markdown content={lesson.content} /> : null}
          continueHref={nextHref}
        />
      )}

      <div className="flex items-center justify-between">
        {lesson.previousSlug ? (
          <Link href={lessonHref(lesson.previousSlug)} className="btn-secondary flex items-center gap-2">
            <ChevronLeft size={18} />
            Previous
          </Link>
        ) : (
          <div />
        )}
        <Link href={nextHref} className="btn-primary flex items-center gap-2">
          {lesson.nextSlug ? "Next Lesson" : "Back to Path"}
          <ChevronRight size={18} />
        </Link>
      </div>
    </div>
  );
}
