"use client";

export interface TranslationResult {
  translated_text: string;
  cultural_note: string;
  formality_level: "formal" | "informal" | "neutral";
  regional_variant: string;
  formality_detail?: string;
  source_lang_detected?: string;
}

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
  entry_type: "translation" | "sign_expression";
  source: string;
  sourceLang: string | null;
  targetLang: string | null;
  signLanguage: string | null;
  timestamp: number;
  created_at: string;
  isPhrasebook: boolean;
  result: TranslationResult;
  sentiment: SignSentiment | null;
  metadata: SignMetadata[];
  wordSequence: string[];
}

export interface TranslateResponse extends TranslationResult {
  history_entry: HistoryEntry;
}

export interface TextToSignResponse {
  sign_language: string;
  word_sequence: string[];
  fingerspell_fallback: string[];
  animation_clips: {
    word: string;
    clip_url: string;
    fingerspell: boolean;
    duration_ms: number;
    tag: string;
  }[];
  sentiment: SignSentiment;
  syntactic_metadata: SignMetadata[];
  history_entry: HistoryEntry;
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

export function translateText(payload: {
  text: string;
  source_lang: string;
  target_lang: string;
}) {
  return apiFetch<TranslateResponse>("/api/translate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getTranslationHistory(limit = 10) {
  const response = await apiFetch<{ data: HistoryEntry[] }>(`/api/history?entry_type=translation&limit=${limit}`);
  return response.data;
}

export async function getSignHistory(limit = 6) {
  const response = await apiFetch<{ data: HistoryEntry[] }>(`/api/history?entry_type=sign_expression&limit=${limit}`);
  return response.data;
}

export async function getPhrasebookEntries(limit = 100) {
  const response = await apiFetch<{ data: HistoryEntry[] }>(`/api/phrasebook?limit=${limit}`);
  return response.data;
}

export function savePhrasebookEntry(historyId: string) {
  return apiFetch<{ entry: HistoryEntry }>("/api/phrasebook", {
    method: "POST",
    body: JSON.stringify({ history_id: historyId }),
  });
}

export function deletePhrasebookEntry(entryId: string) {
  return apiFetch<{ deleted: boolean }>(`/api/phrasebook/${entryId}`, {
    method: "DELETE",
  });
}

export function createTextToSign(payload: { text: string; sign_language: string }) {
  return apiFetch<TextToSignResponse>("/api/text-to-sign", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
