"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Trophy,
  Zap,
  Flame,
  BookOpen,
  Award,
  Medal,
  Crown,
} from "lucide-react";
import { getLevelTitle } from "@/lib/levels";

interface LeaderboardUser {
  id: string;
  name: string;
  image: string | null;
  xp: number;
  level: number;
  streak: number;
  _count: {
    lessonProgress: number;
    badges: number;
  };
}

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      });
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown size={24} className="text-accent-yellow" />;
      case 2:
        return <Medal size={24} className="text-gray-300" />;
      case 3:
        return <Medal size={24} className="text-amber-700" />;
      default:
        return (
          <span className="text-lg font-bold text-kube-500 w-6 text-center">
            {rank}
          </span>
        );
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-accent-yellow/5 border-accent-yellow/30";
      case 2:
        return "bg-gray-300/5 border-gray-400/30";
      case 3:
        return "bg-amber-700/5 border-amber-700/30";
      default:
        return "";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <Trophy size={48} className="text-accent-yellow mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-white mb-2">Leaderboard</h1>
        <p className="text-kube-400">
          Top Kubernetes learners ranked by experience points
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="glass-card p-6 animate-pulse flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-kube-800 rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-kube-800 rounded" />
              </div>
              <div className="h-4 w-16 bg-kube-800 rounded" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Trophy size={48} className="text-kube-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            No learners yet
          </h2>
          <p className="text-kube-400">
            Be the first to join and start earning XP!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user, idx) => {
            const rank = idx + 1;
            const isCurrentUser = session?.user?.id === user.id;

            return (
              <div
                key={user.id}
                className={`glass-card p-5 flex items-center gap-4 transition-all ${getRankBg(
                  rank
                )} ${isCurrentUser ? "ring-2 ring-kube-500/50" : ""}`}
              >
                <div className="w-10 flex items-center justify-center">
                  {getRankIcon(rank)}
                </div>

                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-kube-500 to-accent-purple flex items-center justify-center text-white font-bold text-lg">
                  {user.name?.charAt(0).toUpperCase() || "?"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white truncate">
                      {user.name}
                      {isCurrentUser && (
                        <span className="text-kube-400 text-sm ml-2">
                          (you)
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-kube-400">
                    <span>Lv {user.level}</span>
                    <span>{getLevelTitle(user.level)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1 text-accent-orange">
                    <Flame size={14} />
                    <span>{user.streak}</span>
                  </div>
                  <div className="flex items-center gap-1 text-accent-green">
                    <BookOpen size={14} />
                    <span>{user._count.lessonProgress}</span>
                  </div>
                  <div className="flex items-center gap-1 text-accent-yellow">
                    <Award size={14} />
                    <span>{user._count.badges}</span>
                  </div>
                  <div className="flex items-center gap-1 text-accent-yellow font-bold min-w-[80px] justify-end">
                    <Zap size={16} />
                    <span>{user.xp.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
