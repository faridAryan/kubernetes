"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  Users,
  ChevronRight,
  Zap,
  Search,
  Filter,
} from "lucide-react";
import { getDifficultyColor, getDifficultyBg, formatDuration } from "@/lib/utils";

interface Certification {
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
  modules: {
    id: string;
    name: string;
    _count: { lessons: number };
  }[];
  _count: { enrollments: number };
}

export default function CertificationsPage() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/certifications")
      .then((res) => res.json())
      .then((data) => {
        setCertifications(data);
        setLoading(false);
      });
  }, []);

  const filtered = certifications.filter((cert) => {
    if (filter !== "all" && cert.difficulty !== filter) return false;
    if (search && !cert.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Certification Paths
        </h1>
        <p className="text-kube-400 max-w-2xl mx-auto text-lg">
          Choose a certification path aligned with official CNCF exams. Each
          path includes lessons, quizzes, and hands-on labs.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-kube-500"
          />
          <input
            type="text"
            placeholder="Search certifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "beginner", "intermediate", "advanced", "expert"].map(
            (level) => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  filter === level
                    ? "bg-kube-500 text-white"
                    : "bg-kube-800 text-kube-400 hover:text-white"
                }`}
              >
                {level}
              </button>
            )
          )}
        </div>
      </div>

      {/* Certification Cards */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="glass-card p-8 animate-pulse"
            >
              <div className="h-12 w-12 bg-kube-800 rounded-xl mb-4" />
              <div className="h-6 w-32 bg-kube-800 rounded mb-2" />
              <div className="h-4 w-full bg-kube-800 rounded mb-4" />
              <div className="h-4 w-2/3 bg-kube-800 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((cert) => {
            const totalLessons = cert.modules.reduce(
              (sum, m) => sum + m._count.lessons,
              0
            );
            return (
              <Link
                key={cert.id}
                href={`/certifications/${cert.slug}`}
                className="glass-card-hover p-8 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-5xl">{cert.icon}</div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyBg(
                      cert.difficulty
                    )} ${getDifficultyColor(cert.difficulty)}`}
                  >
                    {cert.difficulty}
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-1">
                  {cert.shortName}
                </h2>
                <p className="text-kube-400 text-sm mb-4">{cert.name}</p>
                <p className="text-kube-300 text-sm mb-6 line-clamp-2">
                  {cert.description}
                </p>

                <div className="flex flex-wrap gap-4 text-sm text-kube-400 mb-6">
                  <div className="flex items-center gap-1">
                    <BookOpen size={14} />
                    <span>{cert.modules.length} modules</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Filter size={14} />
                    <span>{totalLessons} lessons</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{formatDuration(cert.estimatedHours * 60)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={14} />
                    <span>{cert._count.enrollments} enrolled</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap size={14} className="text-accent-yellow" />
                    <span>{cert.totalXp} XP</span>
                  </div>
                </div>

                {/* Module list preview */}
                <div className="space-y-2">
                  {cert.modules.slice(0, 3).map((module, i) => (
                    <div
                      key={module.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <div className="w-6 h-6 rounded-lg bg-kube-800 flex items-center justify-center text-xs text-kube-400 font-mono">
                        {i + 1}
                      </div>
                      <span className="text-kube-300">{module.name}</span>
                      <span className="text-kube-600 text-xs">
                        {module._count.lessons} lessons
                      </span>
                    </div>
                  ))}
                  {cert.modules.length > 3 && (
                    <div className="text-xs text-kube-500 pl-9">
                      +{cert.modules.length - 3} more modules
                    </div>
                  )}
                </div>

                <div className="flex items-center text-kube-400 text-sm mt-6 group-hover:text-kube-300 transition">
                  <span>View full path</span>
                  <ChevronRight
                    size={16}
                    className="ml-1 group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
