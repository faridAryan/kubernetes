"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Flame,
  BookOpen,
  Brain,
  Terminal,
  Trophy,
  Star,
  TrendingUp,
  Award,
  ChevronRight,
  Clock,
} from "lucide-react";
import {
  calculateLevel,
  xpProgress,
  xpForNextLevel,
  getLevelTitle,
} from "@/lib/gamification";

interface UserData {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  enrollments: {
    id: string;
    progress: number;
    certification: {
      slug: string;
      shortName: string;
      name: string;
      icon: string;
      color: string;
    };
  }[];
  badges: {
    badge: {
      name: string;
      icon: string;
      description: string;
      category: string;
    };
    earnedAt: string;
  }[];
  achievements: {
    id: string;
    type: string;
    description: string;
    xpEarned: number;
    createdAt: string;
  }[];
  _count: {
    lessonProgress: number;
    quizAttempts: number;
    labSessions: number;
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/users/me")
        .then((res) => res.json())
        .then((data) => {
          setUser(data);
          setLoading(false);
        });
    }
  }, [status, router]);

  if (loading || !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-40 bg-kube-800 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-kube-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const progress = xpProgress(user.xp);
  const nextLevelXp = xpForNextLevel(user.xp);
  const levelTitle = getLevelTitle(user.level);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Profile Header */}
      <div className="glass-card p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-kube-500 to-accent-purple flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-kube-500/30">
            {user.name?.charAt(0).toUpperCase() || "K"}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{user.name}</h1>
            <p className="text-kube-400 text-sm">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Star size={16} className="text-accent-yellow" />
              <span className="text-accent-yellow font-semibold text-sm">
                Level {user.level} - {levelTitle}
              </span>
            </div>
            <div className="mt-3 max-w-md">
              <div className="flex items-center justify-between text-xs text-kube-400 mb-1">
                <span>{user.xp} XP</span>
                <span>{nextLevelXp} XP to Level {user.level + 1}</span>
              </div>
              <div className="xp-bar h-3">
                <div
                  className="xp-bar-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2 rounded-xl bg-accent-orange/10 border border-accent-orange/30">
              <Flame size={24} className="text-accent-orange mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{user.streak}</div>
              <div className="text-xs text-kube-400">Day Streak</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-kube-500/20 flex items-center justify-center">
              <Zap size={20} className="text-accent-yellow" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{user.xp}</div>
              <div className="text-xs text-kube-400">Total XP</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-green/20 flex items-center justify-center">
              <BookOpen size={20} className="text-accent-green" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {user._count.lessonProgress}
              </div>
              <div className="text-xs text-kube-400">Lessons Done</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center">
              <Brain size={20} className="text-accent-purple" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {user._count.quizAttempts}
              </div>
              <div className="text-xs text-kube-400">Quiz Correct</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-cyan/20 flex items-center justify-center">
              <Terminal size={20} className="text-accent-cyan" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {user._count.labSessions}
              </div>
              <div className="text-xs text-kube-400">Labs Completed</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Enrolled Paths */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-kube-400" />
            Your Learning Paths
          </h2>
          {user.enrollments.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <BookOpen
                size={48}
                className="text-kube-600 mx-auto mb-4"
              />
              <h3 className="text-lg font-semibold text-white mb-2">
                No enrollments yet
              </h3>
              <p className="text-kube-400 text-sm mb-4">
                Start your Kubernetes learning journey by enrolling in a
                certification path.
              </p>
              <Link href="/certifications" className="btn-primary inline-flex items-center gap-2">
                Browse Paths
                <ChevronRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {user.enrollments.map((enrollment) => (
                <Link
                  key={enrollment.id}
                  href={`/certifications/${enrollment.certification.slug}`}
                  className="glass-card-hover p-6 flex items-center gap-4 block"
                >
                  <div className="text-4xl">
                    {enrollment.certification.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">
                      {enrollment.certification.shortName}
                    </h3>
                    <p className="text-sm text-kube-400">
                      {enrollment.certification.name}
                    </p>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-kube-400 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(enrollment.progress)}%</span>
                      </div>
                      <div className="xp-bar h-2">
                        <div
                          className="xp-bar-fill"
                          style={{ width: `${enrollment.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-kube-500" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity & Badges */}
        <div className="space-y-6">
          {/* Badges */}
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Award size={20} className="text-accent-yellow" />
              Badges ({user.badges.length})
            </h2>
            {user.badges.length === 0 ? (
              <div className="glass-card p-6 text-center">
                <p className="text-kube-400 text-sm">
                  Complete lessons and labs to earn badges!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {user.badges.map((ub, i) => (
                  <div
                    key={i}
                    className="glass-card p-3 text-center badge-glow"
                    title={ub.badge.description}
                  >
                    <div className="text-2xl mb-1">{ub.badge.icon}</div>
                    <div className="text-xs text-kube-300 truncate">
                      {ub.badge.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Clock size={20} className="text-kube-400" />
              Recent Activity
            </h2>
            <div className="glass-card divide-y divide-kube-800">
              {user.achievements.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-kube-400 text-sm">
                    Your activity will show here as you learn.
                  </p>
                </div>
              ) : (
                user.achievements.slice(0, 10).map((achievement) => (
                  <div
                    key={achievement.id}
                    className="p-4 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-kube-800 flex items-center justify-center">
                      {achievement.type === "lesson_complete" && (
                        <BookOpen size={14} className="text-accent-green" />
                      )}
                      {achievement.type === "quiz_correct" && (
                        <Brain size={14} className="text-accent-purple" />
                      )}
                      {achievement.type === "lab_complete" && (
                        <Terminal size={14} className="text-accent-cyan" />
                      )}
                      {achievement.type === "level_up" && (
                        <Star size={14} className="text-accent-yellow" />
                      )}
                      {achievement.type === "enrollment" && (
                        <BookOpen size={14} className="text-kube-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-kube-200 truncate">
                        {achievement.description}
                      </p>
                    </div>
                    {achievement.xpEarned > 0 && (
                      <span className="text-xs text-accent-yellow flex items-center gap-1 shrink-0">
                        <Zap size={12} />+{achievement.xpEarned}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
