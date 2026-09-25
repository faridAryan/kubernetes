import type { Metadata } from "next";
import { Trophy, Zap, Flame, BookOpen, Award, Medal, Crown } from "lucide-react";
import { getUserId } from "@/lib/http";
import { getLevelTitle } from "@/lib/levels";
import { getLeaderboard } from "@/lib/queries/leaderboard";

export const metadata: Metadata = { title: "Leaderboard - KubeLearn" };

const RANK_STYLES: Record<number, { icon: JSX.Element; bg: string }> = {
  1: { icon: <Crown size={24} className="text-accent-yellow" />, bg: "bg-accent-yellow/5 border-accent-yellow/30" },
  2: { icon: <Medal size={24} className="text-gray-300" />, bg: "bg-gray-300/5 border-gray-400/30" },
  3: { icon: <Medal size={24} className="text-amber-700" />, bg: "bg-amber-700/5 border-amber-700/30" },
};

export default async function LeaderboardPage() {
  const [users, currentUserId] = await Promise.all([getLeaderboard(), getUserId()]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <Trophy size={48} className="text-accent-yellow mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-white mb-2">Leaderboard</h1>
        <p className="text-kube-400">Top Kubernetes learners ranked by experience points</p>
      </div>

      {users.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Trophy size={48} className="text-kube-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No learners yet</h2>
          <p className="text-kube-400">Be the first to join and start earning XP!</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {users.map((user, idx) => {
            const rank = idx + 1;
            const isCurrentUser = currentUserId === user.id;

            return (
              <li
                key={user.id}
                className={`glass-card p-5 flex items-center gap-4 ${RANK_STYLES[rank]?.bg ?? ""} ${isCurrentUser ? "ring-2 ring-kube-500/50" : ""}`}
              >
                <div className="w-10 flex items-center justify-center">
                  {RANK_STYLES[rank]?.icon ?? <span className="text-lg font-bold text-kube-500">{rank}</span>}
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-kube-500 to-accent-purple flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {user.name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">
                    {user.name}
                    {isCurrentUser && <span className="text-kube-400 text-sm ml-2">(you)</span>}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-kube-400">
                    <span>Lv {user.level}</span>
                    <span>{getLevelTitle(user.level)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 text-sm">
                  <span className="hidden sm:flex items-center gap-1 text-accent-orange" title="Day streak">
                    <Flame size={14} />
                    {user.streak}
                  </span>
                  <span className="hidden sm:flex items-center gap-1 text-accent-green" title="Lessons completed">
                    <BookOpen size={14} />
                    {user.lessonsCompleted}
                  </span>
                  <span className="hidden sm:flex items-center gap-1 text-accent-yellow" title="Badges">
                    <Award size={14} />
                    {user.badges}
                  </span>
                  <span className="flex items-center gap-1 text-accent-yellow font-bold min-w-[80px] justify-end">
                    <Zap size={16} />
                    {user.xp.toLocaleString()}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
