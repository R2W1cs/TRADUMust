"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usersApi } from "@/lib/tradumust-api";

export type ModeType = "light" | "dark";

interface ThemeContextType {
  mode: ModeType;
  toggleMode: () => void;
  setMode: (mode: ModeType) => void;
  applyMode: (mode: ModeType, persist?: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ModeType>("light");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-japan", "theme-france", "theme-mexico", "dark-mode");
    if (mode === "dark") root.classList.add("dark-mode");
  }, [mode]);

  const persistTheme = useCallback(async (next: ModeType) => {
    const token = localStorage.getItem("tradumust_token");
    if (!token) return;
    try {
      await usersApi.updateProfile({ theme: next });
    } catch {
      /* offline */
    }
  }, []);

  const applyMode = useCallback(
    (next: ModeType, persist = true) => {
      setModeState(next);
      if (persist) persistTheme(next);
    },
    [persistTheme]
  );

  const setMode = useCallback(
    (next: ModeType) => applyMode(next, true),
    [applyMode]
  );

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      persistTheme(next);
      return next;
    });
  }, [persistTheme]);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode, setMode, applyMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

