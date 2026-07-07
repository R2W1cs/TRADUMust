"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  HandMetal, GraduationCap, ArrowRight, TrendingUp, Clock, Star,
  Loader2, Flame, Target, BookOpen, Zap,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useProgressStats } from "@/lib/hooks/useProgress";
import { historyApi, progressApi } from "@/lib/tradumust-api";
import { useAppSelector } from "@/lib/store/hooks";

const QUICK_ACTIONS = [
  { href: "/learn", icon: GraduationCap, label: "Continue learning", desc: "Duolingo-style sign lessons", color: "bg-[var(--learn-green,#58CC02)]" },
  { href: "/sign", icon: HandMetal, label: "Sign studio", desc: "Text to avatar & recognition", color: "bg-[var(--brand-secondary)]" },
  { href: "/history", icon: Clock, label: "History", desc: "Past translations", color: "bg-[var(--brand-primary)]" },
];

const TIPS = [
  "Practice 10 minutes daily to maintain your streak.",
  "Watch the avatar carefully before answering — facial expressions matter in ASL.",
  "Use the Sign Studio to translate phrases before your next lesson.",
];

export default function DashboardPage() {
  const token = useAppSelector((s) => s.auth.token);
  const { user } = useAppSelector((s) => s.auth);
  const { xp, lessonsDone, streak, level, achievements, badges, isLoading: progressLoading } = useProgressStats();

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["history-recent"],
    queryFn: () => historyApi.list({ page: 1 }),
    enabled: !!token,
  });

  const { data: progressData } = useQuery({
    queryKey: ["progress"],
    queryFn: progressApi.get,
    enabled: !!token,
  });

  const translationCount = historyData?.total ?? 0;
  const recentItems = historyData?.items?.slice(0, 5) ?? [];
  const dailyGoal = 50;
  const dailyProgress = Math.min(xp % dailyGoal, dailyGoal);
  const tipOfDay = TIPS[new Date().getDate() % TIPS.length];

  return (
    <DashboardLayout>
      <div className="w-full space-y-8">
        {/* Hero banner — no surface-card (it forces white bg and hides text-white in light mode) */}
        <div className="rounded-[var(--radius-lg)] p-6 md:p-8 bg-gradient-to-r from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white shadow-[0_4px_16px_var(--shadow-color)] border border-[var(--brand-primary)]/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium opacity-90">Welcome back</p>
              <h1 className="text-2xl md:text-3xl font-semibold mt-1">
                {user?.name ? `${user.name.split(" ")[0]}'s workspace` : "TRADUMUST"}
              </h1>
              <p className="mt-2 opacity-90 max-w-md">
                Translate, learn, and track your sign language progress — all in one place.
              </p>
            </div>
            <Button href="/learn" className="bg-white text-[var(--brand-primary)] hover:bg-white/90 border-white shrink-0">
              <GraduationCap className="w-4 h-4" /> Start learning
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "XP", value: progressLoading ? "—" : xp, icon: Zap, color: "text-[var(--brand-primary)]" },
            { label: "Streak", value: progressLoading ? "—" : `${streak} days`, icon: Flame, color: "text-[var(--warning)]" },
            { label: "Level", value: progressLoading ? "—" : level, icon: Star, color: "text-[var(--brand-secondary)]" },
            { label: "Lessons", value: progressLoading ? "—" : lessonsDone, icon: BookOpen, color: "text-[var(--brand-accent)]" },
          ].map((stat) => (
            <Card key={stat.label} padding="md">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} aria-hidden />
              <p className="text-2xl font-semibold text-[var(--foreground)]">{stat.value}</p>
              <p className="text-sm text-[var(--text-secondary)]">{stat.label}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily goal */}
          <Card padding="md" className="lg:col-span-1">
            <h2 className="font-semibold flex items-center gap-2 mb-4 text-[var(--foreground)]">
              <Target className="w-5 h-5 text-[var(--brand-primary)]" /> Daily goal
            </h2>
            <div className="h-3 bg-[var(--surface-muted)] rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-[var(--brand-primary)] rounded-full"
                style={{ width: `${(dailyProgress / dailyGoal) * 100}%` }}
              />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{dailyProgress} / {dailyGoal} XP today</p>
            <Link href="/learn" className="mt-4 inline-flex text-sm font-medium text-[var(--brand-primary)] hover:underline">
              Earn more XP →
            </Link>
          </Card>

          {/* Tip */}
          <Card padding="md" className="lg:col-span-2">
            <h2 className="font-semibold mb-2 text-[var(--foreground)]">Tip of the day</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">{tipOfDay}</p>
          </Card>
        </div>

        {/* Quick actions */}
        <section aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className="text-lg font-semibold mb-4 text-[var(--foreground)]">Quick actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group surface-card p-6 rounded-[var(--radius-lg)] hover:border-[var(--brand-primary)]/40 transition-colors"
              >
                <div className={`w-12 h-12 rounded-[var(--radius-md)] ${action.color} flex items-center justify-center mb-4`}>
                  <action.icon className="w-6 h-6 text-white" aria-hidden />
                </div>
                <h3 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--brand-primary)]">{action.label}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{action.desc}</p>
                <ArrowRight className="w-4 h-4 mt-3 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
              </Link>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card padding="md">
            <h2 className="font-semibold mb-4 text-[var(--foreground)]">Recent translations</h2>
            {!token ? (
              <p className="text-sm text-[var(--text-secondary)]">
                <Link href="/login" className="text-[var(--brand-primary)] hover:underline font-medium">Sign in</Link> to view history.
              </p>
            ) : historyLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[var(--brand-primary)]" />
            ) : recentItems.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                No translations yet. <Link href="/sign" className="text-[var(--brand-primary)] hover:underline font-medium">Open Sign Studio</Link>
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {recentItems.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4 border-b border-[var(--border)] pb-2 last:border-0">
                    <span className="truncate text-[var(--foreground)]">{item.outputText || item.inputText}</span>
                    <span className="shrink-0 text-[var(--text-secondary)] font-medium">{item.signLanguage}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padding="md">
            <h2 className="font-semibold mb-4 text-[var(--foreground)]">Achievements & badges</h2>
            {!token ? (
              <p className="text-sm text-[var(--text-secondary)]">Sign in to track progress.</p>
            ) : progressLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[var(--brand-primary)]" />
            ) : achievements.length === 0 && badges.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">Complete lessons to unlock achievements.</p>
                <Button href="/learn" variant="secondary" size="sm">Go to Learn</Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {achievements.map((a) => (
                  <div key={a.achievement.title} className="flex items-center gap-2 bg-[var(--surface-muted)] rounded-[var(--radius-md)] px-3 py-2" title={a.achievement.description}>
                    <span className="text-xl">{a.achievement.icon}</span>
                    <span className="text-sm font-medium text-[var(--foreground)]">{a.achievement.title}</span>
                  </div>
                ))}
                {badges.map((b) => (
                  <div key={b.badge.title} className="flex items-center gap-2 bg-[var(--brand-primary)]/10 rounded-[var(--radius-md)] px-3 py-2">
                    <span className="text-xl">{b.badge.icon}</span>
                    <span className="text-sm font-medium text-[var(--foreground)]">{b.badge.title}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Recent lesson activity */}
        {token && progressData?.lessonProgress && progressData.lessonProgress.length > 0 && (
          <Card padding="md">
            <h2 className="font-semibold mb-4 flex items-center gap-2 text-[var(--foreground)]">
              <TrendingUp className="w-5 h-5 text-[var(--brand-primary)]" /> Recent lesson activity
            </h2>
            <ul className="space-y-2 text-sm">
              {progressData.lessonProgress.slice(0, 5).map((lp) => (
                <li key={lp.lessonId} className="flex justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <span className="text-[var(--foreground)]">{lp.lesson?.title ?? "Lesson"}</span>
                  <span className={lp.completed ? "text-[var(--success)] font-medium" : "text-[var(--text-secondary)]"}>
                    {lp.completed ? "Completed" : "In progress"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
