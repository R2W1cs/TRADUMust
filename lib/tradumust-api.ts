"use client";

import type { SignLanguageCode } from "./sign-languages";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const AI_BASE = process.env.NEXT_PUBLIC_AI_URL || "http://localhost:8001";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tradumust_token");
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api<{ token: string; user: unknown }>("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    api<{ token: string; user: unknown }>("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: () => api<{ user: unknown; progress: unknown }>("/api/auth/me"),
  forgotPassword: (email: string) =>
    api("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    api("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),
};

export const usersApi = {
  profile: () => api<{ user: import("./api-types").UserProfile }>("/api/users/profile"),
  updateProfile: (data: {
    name?: string;
    preferredLanguage?: SignLanguageCode;
    theme?: "light" | "dark" | "system";
  }) => api<{ user: import("./api-types").UserProfile }>("/api/users/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
};

export const lessonsApi = {
  languages: () => api<{ languages: unknown[] }>("/api/lessons/languages"),
  units: (lang: string) =>
    api<{ units: import("./api-types").UnitWithLessons[] }>(`/api/lessons/units/${lang}`),
  lesson: (id: string) =>
    api<{ lesson: { id: string; title: string; exercises: import("./api-types").LessonExercise[] }; progress: unknown }>(
      `/api/lessons/${id}`
    ),
  complete: (id: string, score: number) =>
    api(`/api/lessons/${id}/complete`, { method: "POST", body: JSON.stringify({ score }) }),
  submitExercise: (lessonId: string, exerciseId: string, answer: string) =>
    api(`/api/lessons/${lessonId}/exercise/${exerciseId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answer }),
    }),
};

export const progressApi = {
  get: () => api<import("./api-types").ProgressResponse>("/api/progress"),
  leaderboard: (period = "weekly") =>
    api<{ entries: Array<{ xp: number; user: { name: string } }>; period: string }>(
      `/api/progress/leaderboard?period=${period}`
    ),
  map: (lang: string) => api<{ units: import("./api-types").MapUnit[] }>(`/api/progress/map/${lang}`),
};

export const avatarApi = {
  translate: (text: string, signLanguage: string) =>
    api("/api/avatar/translate", { method: "POST", body: JSON.stringify({ text, signLanguage }) }),
};

export const recognizeApi = {
  save: (data: { text: string; signLanguage: string; confidence?: number }) =>
    api("/api/recognize/save", { method: "POST", body: JSON.stringify(data) }),
};

export const historyApi = {
  list: (params?: { page?: number; search?: string; favorite?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.search) q.set("search", params.search);
    if (params?.favorite) q.set("favorite", "true");
    return api<import("./api-types").HistoryListResponse>(`/api/history?${q}`);
  },
  toggleFavorite: (id: string) =>
    api(`/api/history/${id}/favorite`, { method: "PATCH" }),
  delete: (id: string) => api(`/api/history/${id}`, { method: "DELETE" }),
};

export const adminApi = {
  analytics: () => api<import("./api-types").AdminAnalytics>("/api/admin/analytics"),
  users: (page = 1) =>
    api<{ users: Array<{ id: string; name: string; email: string; role: string; createdAt: string; progress?: { xp: number; level: number; lives: number; dailyStreak: number } }>; total: number }>(
      `/api/admin/users?page=${page}`
    ),
  lessons: () =>
    api<{ lessons: Array<{ id: string; title: string; category: string; xpReward: number; unit: { title: string; signLanguage: { code: string } }; _count: { exercises: number } }> }>(
      "/api/admin/lessons"
    ),
  auditLogs: () =>
    api<{ logs: Array<{ id: string; action: string; resource: string; createdAt: string; user: { name: string; email: string } | null }> }>(
      "/api/admin/audit-logs"
    ),
};

export const searchApi = {
  query: (q: string) => api(`/api/search?q=${encodeURIComponent(q)}`),
};

export const signAiApi = {
  classify: (data: {
    right_hand?: Array<{ x: number; y: number; z?: number }>;
    left_hand?: Array<{ x: number; y: number; z?: number }>;
    sign_language?: SignLanguageCode;
  }) =>
    fetch(`${AI_BASE}/api/sign/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        right_hand: data.right_hand ?? [],
        left_hand: data.left_hand ?? [],
        sign_language: data.sign_language ?? "ASL",
      }),
    }).then(async (res) => {
      if (!res.ok) throw new Error("Classification failed");
      return res.json() as Promise<{ predicted_sign: string; confidence: number }>;
    }),
};

