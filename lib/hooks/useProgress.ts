"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/lib/store/hooks";
import { progressApi } from "@/lib/tradumust-api";
import { MAX_LIVES } from "@/lib/lives";
import type { UserProgress } from "@/lib/api-types";

export function useUserProgress() {
  const token = useAppSelector((s) => s.auth.token);

  return useQuery({
    queryKey: ["progress"],
    queryFn: progressApi.get,
    enabled: !!token,
    staleTime: 30_000,
    refetchInterval: (query) => {
      const progress = query.state.data?.progress as UserProgress | null | undefined;
      if (progress && progress.lives < MAX_LIVES && progress.nextLifeRegenAt) {
        return 30_000;
      }
      return false;
    },
  });
}

export function useProgressStats() {
  const { data, isLoading } = useUserProgress();
  const progress = data?.progress as UserProgress | null | undefined;

  const lessonsDone =
    data?.lessonProgress?.filter((lp) => lp.completed).length ?? 0;

  return {
    isLoading,
    xp: progress?.xp ?? 0,
    level: progress?.level ?? 1,
    lives: progress?.lives ?? MAX_LIVES,
    maxLives: MAX_LIVES,
    nextLifeRegenAt: progress?.nextLifeRegenAt ?? null,
    streak: progress?.dailyStreak ?? 0,
    lessonsDone,
    achievements: data?.achievements ?? [],
    badges: data?.badges ?? [],
    certificates: data?.certificates ?? [],
    lessonProgress: data?.lessonProgress ?? [],
  };
}
