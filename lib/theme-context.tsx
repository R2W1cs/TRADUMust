"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeType = "default" | "japan" | "france" | "mexico";
export type ModeType = "light" | "dark";

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  mode: ModeType;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeType>("default");
  const [mode, setMode] = useState<ModeType>("light");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-japan", "theme-france", "theme-mexico", "dark-mode");

    if (theme !== "default") {
      root.classList.add(`theme-${theme}`);
    }

    if (mode === "dark") {
      root.classList.add("dark-mode");
    }
  }, [theme, mode]);

  const toggleMode = () => setMode(prev => prev === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mode, toggleMode }}>
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
