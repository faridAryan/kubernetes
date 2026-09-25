"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Clock, Users, ChevronRight, Zap, Search, Layers } from "lucide-react";
import { getDifficultyColor, getDifficultyBg, formatDuration } from "@/lib/utils";
import type { CertificationSummary } from "@/lib/queries/certifications";

const LEVELS = ["all", "beginner", "intermediate", "advanced", "expert"];

export default function CertificationList({ certifications }: { certifications: CertificationSummary[] }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const filtered = certifications.filter(
    (cert) =>
      (filter === "all" || cert.difficulty === filter) &&
      (query === "" || `${cert.name} ${cert.shortName}`.toLowerCase().includes(query))
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kube-500" />
          <input
            type="text"
            placeholder="Search certifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
            aria-label="Search certifications"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                filter === level ? "bg-kube-500 text-white" : "bg-kube-800 text-kube-400 hover:text-white"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-kube-400 py-12">No certification paths match your filters.</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((cert) => (
          <Link key={cert.id} href={`/certifications/${cert.slug}`} className="glass-card-hover p-8 group">
            <div className="flex items-start justify-between mb-4">
              <div className="text-5xl">{cert.icon}</div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyBg(cert.difficulty)} ${getDifficultyColor(cert.difficulty)}`}
              >
                {cert.difficulty}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">{cert.shortName}</h2>
            <p className="text-kube-400 text-sm mb-4">{cert.name}</p>
            <p className="text-kube-300 text-sm mb-6 line-clamp-2">{cert.description}</p>

            <div className="flex flex-wrap gap-4 text-sm text-kube-400 mb-6">
              <span className="flex items-center gap-1">
                <Layers size={14} />
                {cert.modules.length} modules
              </span>
              <span className="flex items-center gap-1">
                <BookOpen size={14} />
                {cert.lessonCount} lessons
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {formatDuration(cert.estimatedHours * 60)}
              </span>
              <span className="flex items-center gap-1">
                <Users size={14} />
                {cert.enrollments} enrolled
              </span>
              <span className="flex items-center gap-1">
                <Zap size={14} className="text-accent-yellow" />
                {cert.totalXp} XP
              </span>
            </div>

            <div className="space-y-2">
              {cert.modules.slice(0, 3).map((module, i) => (
                <div key={module.id} className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-lg bg-kube-800 flex items-center justify-center text-xs text-kube-400 font-mono">
                    {i + 1}
                  </div>
                  <span className="text-kube-300">{module.name}</span>
                  <span className="text-kube-600 text-xs">{module.lessonCount} lessons</span>
                </div>
              ))}
              {cert.modules.length > 3 && (
                <div className="text-xs text-kube-500 pl-9">+{cert.modules.length - 3} more modules</div>
              )}
            </div>

            <div className="flex items-center text-kube-400 text-sm mt-6 group-hover:text-kube-300 transition">
              <span>View full path</span>
              <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
