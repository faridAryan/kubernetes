import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Zap,
  Flame,
  BookOpen,
  Brain,
  Terminal,
  Star,
  TrendingUp,
  Award,
  ChevronRight,
  Clock,
  RotateCcw,
  FileCheck,
} from "lucide-react";
import { AchievementType } from "@prisma/client";
import { getUserId } from "@/lib/http";
import { xpProgress, xpForNextLevel, getLevelTitle } from "@/lib/levels";
import { getDashboard } from "@/lib/queries/dashboard";

export const metadata: Metadata = { title: "Dashboard - KubeLearn" };

const ACTIVITY_ICONS: Record<AchievementType, JSX.Element> = {
  lesson_complete: <BookOpen size={14} className="text-accent-green" />,
  quiz_correct: <Brain size={14} className="text-accent-purple" />,
  lab_complete: <Terminal size={14} className="text-accent-cyan" />,
  level_up: <Star size={14} className="text-accent-yellow" />,
  enrollment: <BookOpen size={14} className="text-kube-400" />,
  badge_earned: <Award size={14} className="text-accent-yellow" />,
  exam_passed: <FileCheck size={14} className="text-accent-green" />,
};

function StatCard({ icon, value, label }: { icon: JSX.Element; value: number; label: string }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-kube-800 flex items-center justify-center">{icon}</div>
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-xs text-kube-400">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const userId = await getUserId();
  if (userId === null) redirect("/login");

  const user = await getDashboard(userId);
  if (user === null) redirect("/login");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                Level {user.level} - {getLevelTitle(user.level)}
              </span>
            </div>
            <div className="mt-3 max-w-md">
              <div className="flex items-center justify-between text-xs text-kube-400 mb-1">
                <span>{user.xp} XP</span>
                <span>
                  {xpForNextLevel(user.xp)} XP to Level {user.level + 1}
                </span>
              </div>
              <div className="xp-bar h-3">
                <div className="xp-bar-fill" style={{ width: `${xpProgress(user.xp)}%` }} />
              </div>
            </div>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-accent-orange/10 border border-accent-orange/30">
            <Flame size={24} className="text-accent-orange mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{user.streak}</div>
            <div className="text-xs text-kube-400">Day Streak</div>
            <div className="text-[10px] text-kube-500">Best {user.longestStreak}</div>
          </div>
        </div>
      </div>

      {user.reviewsDue > 0 && (
        <Link
          href="/review"
          className="glass-card-hover p-5 mb-8 flex items-center gap-4 border border-accent-purple/30"
        >
          <RotateCcw size={24} className="text-accent-purple" />
          <div className="flex-1">
            <div className="text-white font-semibold">
              {user.reviewsDue} {user.reviewsDue === 1 ? "question is" : "questions are"} due for review
            </div>
            <div className="text-sm text-kube-400">A quick review keeps what you learned from fading.</div>
          </div>
          <ChevronRight size={20} className="text-kube-500" />
        </Link>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Zap size={20} className="text-accent-yellow" />} value={user.xp} label="Total XP" />
        <StatCard icon={<BookOpen size={20} className="text-accent-green" />} value={user.lessonsCompleted} label="Lessons Done" />
        <StatCard icon={<Brain size={20} className="text-accent-purple" />} value={user.correctAnswers} label="Correct Answers" />
        <StatCard icon={<Terminal size={20} className="text-accent-cyan" />} value={user.labsCompleted} label="Labs Completed" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-kube-400" />
            Your Learning Paths
          </h2>
          {user.enrollments.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <BookOpen size={48} className="text-kube-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No enrollments yet</h3>
              <p className="text-kube-400 text-sm mb-4">
                Start your Kubernetes learning journey by enrolling in a certification path.
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
                  className="glass-card-hover p-6 flex items-center gap-4"
                >
                  <div className="text-4xl">{enrollment.certification.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{enrollment.certification.shortName}</h3>
                    <p className="text-sm text-kube-400">{enrollment.certification.name}</p>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-kube-400 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(enrollment.progress)}%</span>
                      </div>
                      <div className="xp-bar h-2">
                        <div className="xp-bar-fill" style={{ width: `${enrollment.progress}%` }} />
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-kube-500" />
                </Link>
              ))}
            </div>
          )}

          {user.certificates.length > 0 && (
            <>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileCheck size={20} className="text-accent-green" />
                Certificates
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user.certificates.map((certificate) => (
                  <Link
                    key={certificate.code}
                    href={`/certificates/${certificate.code}`}
                    className="glass-card-hover p-5 flex items-center gap-3"
                  >
                    <span className="text-3xl">{certificate.certification.icon}</span>
                    <span className="text-white font-semibold">{certificate.certification.shortName} certificate</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Award size={20} className="text-accent-yellow" />
              Badges ({user.badges.length})
            </h2>
            {user.badges.length === 0 ? (
              <div className="glass-card p-6 text-center">
                <p className="text-kube-400 text-sm">Complete lessons and labs to earn badges!</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {user.badges.map(({ badge }) => (
                  <div key={badge.slug} className="glass-card p-3 text-center badge-glow" title={badge.description}>
                    <div className="text-2xl mb-1">{badge.icon}</div>
                    <div className="text-xs text-kube-300 truncate">{badge.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Clock size={20} className="text-kube-400" />
              Recent Activity
            </h2>
            <div className="glass-card divide-y divide-kube-800">
              {user.achievements.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-kube-400 text-sm">Your activity will show here as you learn.</p>
                </div>
              ) : (
                user.achievements.map((achievement) => (
                  <div key={achievement.id} className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-kube-800 flex items-center justify-center">
                      {ACTIVITY_ICONS[achievement.type]}
                    </div>
                    <p className="flex-1 min-w-0 text-sm text-kube-200 truncate">{achievement.description}</p>
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
