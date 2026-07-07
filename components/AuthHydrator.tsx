"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { authApi } from "@/lib/tradumust-api";
import { setCredentials, setToken, logout } from "@/lib/store/slices/authSlice";
import { updateProgress } from "@/lib/store/slices/learnSlice";
import { useTheme } from "@/lib/theme-context";
import type { UserProgress } from "@/lib/api-types";
import type { User } from "@/lib/store/slices/authSlice";

export function AuthHydrator() {
  const dispatch = useAppDispatch();
  const { token, user } = useAppSelector((s) => s.auth);

  // Rehydrate token from localStorage after mount (SSR-safe)
  useEffect(() => {
    const stored = localStorage.getItem("tradumust_token");
    if (stored && !token) {
      dispatch(setToken(stored));
    }
  }, [dispatch, token]);

  useEffect(() => {
    if (!token || user) return;

    authApi
      .me()
      .then(({ user: u, progress }) => {
        dispatch(setCredentials({ user: u as User, token }));
        const p = progress as UserProgress | null;
        if (p) {
          dispatch(
            updateProgress({
              xp: p.xp,
              level: p.level,
              lives: p.lives,
              nextLifeRegenAt: p.nextLifeRegenAt ?? null,
              streak: p.dailyStreak,
            })
          );
        }
      })
      .catch(() => dispatch(logout()));
  }, [token, user, dispatch]);

  return null;
}

export function ThemeSyncFromUser() {
  const { user } = useAppSelector((s) => s.auth);
  const { applyMode } = useTheme();

  useEffect(() => {
    if (!user?.theme || user.theme === "system") return;
    if (user.theme === "dark" || user.theme === "light") {
      applyMode(user.theme, false);
    }
  }, [user?.theme, applyMode]);

  return null;
}
