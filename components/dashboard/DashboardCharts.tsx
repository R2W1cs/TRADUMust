"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { HistoryListResponse, ProgressResponse } from "@/lib/api-types";

const COLORS = {
  primary: "#0B5E6A",
  secondary: "#1E3A5F",
  accent: "#0EA5C9",
  warning: "#B45309",
  success: "#0D7A4E",
  muted: "#94A3B8",
};

const PIE_COLORS = [COLORS.primary, COLORS.accent, COLORS.secondary, COLORS.warning, COLORS.success, COLORS.muted];

function lastNDays(n: number) {
  const days: { key: string; label: string; date: Date }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      date: d,
    });
  }
  return days;
}

function dayKey(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

interface DashboardChartsProps {
  historyItems: HistoryListResponse["items"];
  lessonProgress: ProgressResponse["lessonProgress"];
  xp: number;
  level: number;
  streak: number;
}

export function DashboardCharts({
  historyItems,
  lessonProgress,
  xp,
  level,
  streak,
}: DashboardChartsProps) {
  const weekActivity = useMemo(() => {
    const days = lastNDays(7);
    const translations = new Map<string, number>();
    const lessons = new Map<string, number>();

    for (const item of historyItems) {
      const key = dayKey(item.createdAt);
      if (!key) continue;
      translations.set(key, (translations.get(key) ?? 0) + 1);
    }
    for (const lp of lessonProgress) {
      if (!lp.completed) continue;
      const key = dayKey(lp.updatedAt);
      if (!key) continue;
      lessons.set(key, (lessons.get(key) ?? 0) + 1);
    }

    return days.map((d) => ({
      day: d.label,
      translations: translations.get(d.key) ?? 0,
      lessons: lessons.get(d.key) ?? 0,
    }));
  }, [historyItems, lessonProgress]);

  const languageShare = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of historyItems) {
      const lang = item.signLanguage || "Other";
      counts.set(lang, (counts.get(lang) ?? 0) + 1);
    }
    const rows = [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    return rows.length ? rows : [{ name: "No data", value: 1 }];
  }, [historyItems]);

  const lessonStatus = useMemo(() => {
    const completed = lessonProgress.filter((l) => l.completed).length;
    const inProgress = lessonProgress.filter((l) => !l.completed).length;
    if (completed + inProgress === 0) {
      return [
        { name: "Completed", value: 0 },
        { name: "In progress", value: 0 },
      ];
    }
    return [
      { name: "Completed", value: completed },
      { name: "In progress", value: inProgress },
    ];
  }, [lessonProgress]);

  const levelProgress = useMemo(() => {
    const xpPerLevel = 100;
    const intoLevel = xp % xpPerLevel;
    return [
      { name: "Earned", value: intoLevel },
      { name: "Remaining", value: Math.max(0, xpPerLevel - intoLevel) },
    ];
  }, [xp]);

  const hasTranslationData = historyItems.length > 0;
  const hasLessonData = lessonProgress.length > 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card padding="md" className="lg:col-span-2">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-semibold text-[var(--foreground)]">Weekly activity</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Translations and completed lessons over the last 7 days
            </p>
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)]">
            Streak {streak} · Level {level}
          </p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weekActivity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillTranslations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillLessons" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="translations"
                name="Translations"
                stroke={COLORS.primary}
                fill="url(#fillTranslations)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="lessons"
                name="Lessons"
                stroke={COLORS.accent}
                fill="url(#fillLessons)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {!hasTranslationData && !hasLessonData && (
          <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
            Practice or translate to populate this chart
          </p>
        )}
      </Card>

      <Card padding="md">
        <h2 className="mb-1 font-semibold text-[var(--foreground)]">Sign languages used</h2>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">Share of your recent translations</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={languageShare}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={hasTranslationData ? 3 : 0}
              >
                {languageShare.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={hasTranslationData ? PIE_COLORS[i % PIE_COLORS.length] : COLORS.muted}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card padding="md">
        <h2 className="mb-1 font-semibold text-[var(--foreground)]">Lesson progress</h2>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">Completed vs still in progress</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={lessonStatus}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={hasLessonData ? 3 : 0}
              >
                <Cell fill={COLORS.success} />
                <Cell fill={COLORS.warning} />
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card padding="md" className="lg:col-span-2">
        <div className="mb-4">
          <h2 className="font-semibold text-[var(--foreground)]">Level progress</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            XP toward level {level + 1} ({xp % 100} / 100)
          </p>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={levelProgress} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
                <Cell fill={COLORS.primary} />
                <Cell fill={COLORS.muted} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
