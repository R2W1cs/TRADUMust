"use client";

export interface SignSentiment {
  polarity: number;
  subjectivity: number;
}

export interface SignMetadata {
  word: string;
  tag: string;
  duration_ms?: number;
}

export interface HistoryEntry {
  id: string;
  entry_type: "sign_expression";
  source: string;
  sourceLang: string | null;
  targetLang: string | null;
  signLanguage: string | null;
  timestamp: number;
  created_at: string;
  isPhrasebook: boolean;
  result: { translated_text: string };
  sentiment: SignSentiment | null;
  metadata: SignMetadata[];
  wordSequence: string[];
  extra: { word_sequence?: string[] };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "The request failed.";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function getSignHistory(limit = 6) {
  const response = await apiFetch<{ data: HistoryEntry[] }>(`/api/history?entry_type=sign_expression&limit=${limit}`);
  return response.data;
}

export function saveRecognizedSign(payload: { text: string; sign_language: string }) {
  return apiFetch<{ status: string; history_entry: HistoryEntry }>("/api/sign/save-recognition", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
