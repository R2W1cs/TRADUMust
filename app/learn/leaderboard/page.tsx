"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Trophy, Medal } from "lucide-react";
import { LearnLayout } from "@/components/learn/LearnLayout";
import { progressApi } from "@/lib/tradumust-api";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LearnLeaderboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => progressApi.leaderboard("weekly"),
  });

  const entries = data?.entries ?? [];

  return (
    <LearnLayout>
      <div className="max-w-md mx-auto px-4 py-8 pb-16">
        <div className="text-center mb-8">
          <Trophy className="w-12 h-12 mx-auto text-[var(--learn-gold)] fill-[var(--learn-gold)] mb-3" />
          <h1 className="text-2xl font-extrabold text-[var(--learn-text)]">Weekly leaderboard</h1>
          <p className="text-sm font-medium text-[var(--learn-text-secondary)] mt-1">
            Top learners this week
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--learn-green)]" />
          </div>
        ) : entries.length === 0 ? (
          <div className="learn-card-surface rounded-2xl p-8 text-center">
            <Medal className="w-10 h-10 mx-auto text-[var(--learn-text-muted)] mb-3" />
            <p className="font-bold text-[var(--learn-text)]">No entries yet</p>
            <p className="text-sm text-[var(--learn-text-secondary)] mt-1">Complete lessons to appear here!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 20).map((entry, i) => (
              <div
                key={i}
                className="flex items-center gap-4 learn-card-surface rounded-2xl px-4 py-3 shadow-sm"
              >
                <span className="w-8 text-center font-extrabold text-lg">
                  {i < 3 ? MEDALS[i] : i + 1}
                </span>
                <div className="w-10 h-10 rounded-full bg-[var(--learn-green)] border-2 border-[var(--learn-green-dark)] flex items-center justify-center text-white font-bold">
                  {entry.user.name[0]}
                </div>
                <span className="flex-1 font-bold text-[var(--learn-text)] truncate">{entry.user.name}</span>
                <span className="font-extrabold text-[var(--learn-gem)]">{entry.xp} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </LearnLayout>
  );
}
