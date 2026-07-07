"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Flame, Heart, Gem, X, Volume2, VolumeX,
  HandMetal, Trophy, Home, User, Sun, Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { updateProgress } from "@/lib/store/slices/learnSlice";
import { useProgressStats } from "@/lib/hooks/useProgress";
import { useLivesCountdown } from "@/lib/hooks/useLivesCountdown";
import { MAX_LIVES } from "@/lib/lives";
import { LearnSceneBackground } from "@/components/learn/LearnSceneBackground";
import { LearnLessonBackground } from "@/components/learn/LearnLessonBackground";

const SIDE_NAV = [
  { href: "/learn", label: "Learn", icon: HandMetal },
  { href: "/learn/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/profile", label: "Profile", icon: User },
];

interface LearnLayoutProps {
  children: React.ReactNode;
  lessonMode?: boolean;
  progress?: number;
  onClose?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  languageBar?: React.ReactNode;
}

export function LearnLayout({
  children,
  lessonMode = false,
  progress = 0,
  onClose,
  soundEnabled = true,
  onToggleSound,
  languageBar,
}: LearnLayoutProps) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { currentLanguage, lives, streak, xp } = useAppSelector((s) => s.learn);
  const progressStats = useProgressStats();
  const regenCountdown = useLivesCountdown(progressStats.nextLifeRegenAt);
  const { mode, toggleMode } = useTheme();

  useEffect(() => {
    if (!progressStats.isLoading) {
      dispatch(
        updateProgress({
          xp: progressStats.xp,
          level: progressStats.level,
          lives: progressStats.lives,
          nextLifeRegenAt: progressStats.nextLifeRegenAt,
          streak: progressStats.streak,
        })
      );
    }
  }, [
    dispatch,
    progressStats.isLoading,
    progressStats.xp,
    progressStats.level,
    progressStats.lives,
    progressStats.nextLifeRegenAt,
    progressStats.streak,
  ]);

  const hearts = (
    <div className="flex flex-col items-end gap-0.5 shrink-0">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: MAX_LIVES }).map((_, i) => (
          <Heart
            key={i}
            className={cn(
              lessonMode ? "w-5 h-5" : "w-4 h-4",
              i < lives ? "fill-[var(--learn-heart)] text-[var(--learn-heart)]" : "text-[var(--learn-border)]"
            )}
          />
        ))}
      </div>
      {lives < MAX_LIVES && regenCountdown && (
        <span className="text-[10px] font-semibold text-[var(--learn-text-muted)] tabular-nums leading-none">
          +1 in {regenCountdown}
        </span>
      )}
    </div>
  );

  const langFlags: Record<string, string> = { ASL: "🇺🇸", BSL: "🇬🇧", LSF: "🇫🇷", TSL: "🇹🇳" };
  const headerH = languageBar && !lessonMode ? "h-[116px]" : "h-[56px]";
  const mainPt = languageBar && !lessonMode ? "pt-[116px]" : "pt-14";

  const themeToggle = (
    <button
      type="button"
      onClick={toggleMode}
      className="p-2 rounded-xl text-[var(--learn-text-muted)] hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
      aria-label={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {mode === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );

  return (
    <div className={cn("learn-app min-h-screen relative", lessonMode ? "learn-lesson-bg" : "learn-scene-bg")}>
      {lessonMode ? <LearnLessonBackground /> : <LearnSceneBackground />}

      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 learn-chrome border-b",
          headerH
        )}
      >
        <div className="h-14 px-4 lg:pl-[220px] flex items-center gap-3 max-w-[1400px] mx-auto">
          {lessonMode ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-[var(--learn-text-muted)] hover:bg-white/10 shrink-0"
                aria-label="Exit lesson"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden border border-[var(--learn-border)] min-w-0">
                <div
                  className="h-full bg-[var(--learn-gem)] rounded-full"
                  style={{ width: `${Math.min(100, progress)}%`, transition: "width 0.3s ease" }}
                />
              </div>
              <div className="w-[110px] shrink-0 flex justify-end">{hearts}</div>
              <button
                type="button"
                onClick={() => onToggleSound?.()}
                className="p-1.5 text-[var(--learn-text-muted)] shrink-0 hover:text-[var(--learn-text)]"
                aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              {themeToggle}
            </>
          ) : (
            <>
              <HandMetal className="w-6 h-6 text-[var(--learn-gem)] shrink-0" aria-hidden />
              <span className="hidden sm:block font-bold text-[var(--learn-text)] truncate tracking-tight">
                Visual Language Studio
              </span>
              <span className="sm:hidden font-bold text-[var(--learn-text)]">{langFlags[currentLanguage] ?? "🤟"} {currentLanguage}</span>
              <div className="flex-1" />
              <div className="flex items-center gap-4 text-sm font-semibold shrink-0 tabular-nums text-[var(--learn-text)]">
                <span className="hidden sm:flex items-center gap-1 w-12 justify-end text-[var(--learn-streak)]">
                  <Flame className="w-5 h-5 fill-[var(--learn-streak)] shrink-0" />
                  {streak}
                </span>
                <span className="flex items-center gap-1 w-16 justify-end text-[var(--learn-gem)]">
                  <Gem className="w-5 h-5 fill-[var(--learn-gem)] shrink-0" />
                  {xp}
                </span>
                <span className="flex justify-end w-[110px]">{hearts}</span>
              </div>
              {themeToggle}
            </>
          )}
        </div>

        {languageBar && !lessonMode && (
          <div className="h-[60px] px-4 lg:pl-[220px] flex items-center border-t border-[var(--learn-chrome-border)] max-w-[1400px] mx-auto">
            {languageBar}
          </div>
        )}
      </header>

      {!lessonMode && (
        <aside
          className={cn(
            "hidden lg:flex fixed inset-y-0 left-0 w-[200px] z-40 flex-col learn-chrome border-r pb-6",
            languageBar ? "pt-[116px]" : "pt-14"
          )}
        >
          {SIDE_NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/learn/leaderboard"
                ? pathname.includes("leaderboard")
                : href === "/learn"
                  ? pathname.startsWith("/learn") && !pathname.includes("leaderboard")
                  : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "mx-3 my-1 flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors",
                  active
                    ? "learn-nav-active"
                    : "text-[var(--learn-text-secondary)] hover:bg-white/8 hover:text-[var(--learn-text)]"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden />
                {label}
              </Link>
            );
          })}
        </aside>
      )}

      <main className={cn("min-h-screen relative z-10", mainPt, !lessonMode && "lg:pl-[200px] pb-20 lg:pb-6")}>
        {children}
      </main>

      {!lessonMode && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-[68px] learn-chrome border-t backdrop-blur-md">
          <div className="h-full flex items-stretch">
            {SIDE_NAV.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/learn/leaderboard"
                  ? pathname.includes("leaderboard")
                  : href === "/learn"
                    ? pathname.startsWith("/learn") && !pathname.includes("leaderboard")
                    : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wide",
                    active ? "text-[var(--learn-gem)]" : "text-[var(--learn-text-muted)]"
                  )}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export function LearnMascot({
  mood = "happy",
  message,
  size = "md",
}: {
  mood?: "happy" | "think" | "celebrate" | "sad";
  message?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "w-16 h-16", md: "w-20 h-20", lg: "w-28 h-28" };
  const iconSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-14 h-14" };

  return (
    <div className="flex flex-col items-center gap-4">
      {message && (
        <div className="relative learn-mascot-bubble rounded-2xl px-6 py-4 text-base font-medium max-w-lg text-center shadow-lg backdrop-blur-md border border-[var(--learn-border)]">
          {message}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 learn-mascot-tail border-r border-b rotate-45" />
        </div>
      )}
      <div
        className={cn(
          sizes[size],
          "learn-mascot-ring rounded-full flex items-center justify-center text-white",
          mood === "celebrate" && "animate-pulse"
        )}
        aria-hidden
      >
        <HandMetal className={cn(iconSizes[size], mood === "sad" && "opacity-60")} />
      </div>
    </div>
  );
}
