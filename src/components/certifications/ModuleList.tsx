"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Brain, CheckCircle2, ChevronDown, ChevronRight, Circle, Lock, Terminal, Zap } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import type { CertificationDetail } from "@/lib/queries/certifications";

const LESSON_ICONS = {
  reading: <BookOpen size={16} />,
  quiz: <Brain size={16} />,
  lab: <Terminal size={16} />,
};

interface Props {
  certSlug: string;
  modules: CertificationDetail["modules"];
}

export default function ModuleList({ certSlug, modules }: Props) {
  // Open the first module that still has work to do
  const firstOpen = modules.find((m) => m.unlocked && m.lessons.some((l) => l.completed === false)) ?? modules[0];
  const [expanded, setExpanded] = useState<Set<string>>(new Set(firstOpen ? [firstOpen.id] : []));

  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  return (
    <div className="space-y-4">
      {modules.map((module, moduleIdx) => {
        const isExpanded = expanded.has(module.id);
        const completedCount = module.lessons.filter((l) => l.completed).length;
        const moduleCompleted = completedCount === module.lessons.length;

        return (
          <div key={module.id} className="glass-card overflow-hidden">
            <button
              onClick={() => toggle(module.id)}
              aria-expanded={isExpanded}
              className="w-full p-6 flex items-center gap-4 hover:bg-kube-800/30 transition"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                  moduleCompleted ? "bg-accent-green/20 text-accent-green" : "bg-kube-800 text-kube-400"
                }`}
              >
                {moduleCompleted ? <CheckCircle2 size={20} /> : module.unlocked ? moduleIdx + 1 : <Lock size={16} />}
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-white">{module.name}</h3>
                <p className="text-sm text-kube-400">
                  {module.lessons.length} lessons
                  {completedCount > 0 && ` - ${completedCount}/${module.lessons.length} complete`}
                  {module.unlocked ? "" : " - finish the previous module to unlock"}
                </p>
              </div>
              <div className="flex items-center gap-2 text-kube-500">
                <Zap size={14} className="text-accent-yellow" />
                <span className="text-xs">{module.xpReward} XP</span>
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
            </button>

            {isExpanded && (
              <div className="px-6 pb-6 space-y-2">
                <p className="text-sm text-kube-400 mb-2">{module.description}</p>
                {module.lessons.map((lesson) => {
                  const row = (
                    <>
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          lesson.completed
                            ? "bg-accent-green/20 text-accent-green"
                            : lesson.status === "in_progress"
                              ? "bg-kube-500/20 text-kube-400"
                              : "bg-kube-800 text-kube-500"
                        }`}
                      >
                        {lesson.completed ? <CheckCircle2 size={16} /> : module.unlocked ? <Circle size={16} /> : <Lock size={14} />}
                      </div>
                      <div className="flex-1 flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-medium ${lesson.completed ? "text-kube-300" : "text-white"}`}>
                          {lesson.title}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border lesson-type-${lesson.type}`}>
                          {LESSON_ICONS[lesson.type]}
                          {lesson.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-kube-500">
                        <span>{formatDuration(lesson.duration)}</span>
                        <span className="flex items-center gap-1">
                          <Zap size={12} className="text-accent-yellow" />
                          {lesson.xpReward}
                        </span>
                      </div>
                    </>
                  );

                  return module.unlocked ? (
                    <Link
                      key={lesson.id}
                      href={`/learn/${certSlug}/${module.slug}/${lesson.slug}`}
                      className="flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-kube-800/50"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div key={lesson.id} className="flex items-center gap-4 p-4 rounded-xl opacity-50 cursor-not-allowed">
                      {row}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
