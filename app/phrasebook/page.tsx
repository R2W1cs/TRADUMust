"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  deletePhrasebookEntry,
  getPhrasebookEntries,
  type HistoryEntry,
} from "@/lib/api-client";

type ViewMode = "grid" | "list";
type PracticeStep = "question" | "reveal" | "done";

// ── Language display map ───────────────────────────────────────────────────
const LANG_LABELS: Record<string, string> = {
  auto: "Auto", en: "English", fr: "French", es: "Spanish", de: "German",
  ja: "Japanese", zh: "Chinese", ar: "Arabic", pt: "Portuguese",
  ko: "Korean", it: "Italian",
};

const LANG_FLAGS: Record<string, string> = {
  en: "🇬🇧", fr: "🇫🇷", es: "🇪🇸", de: "🇩🇪", ja: "🇯🇵",
  zh: "🇨🇳", ar: "🇸🇦", pt: "🇧🇷", ko: "🇰🇷", it: "🇮🇹",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Practice Quiz ──────────────────────────────────────────────────────────
function PracticeModal({
  phrases,
  onClose,
}: {
  phrases: HistoryEntry[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<PracticeStep>("question");
  const [score, setScore] = useState({ correct: 0, wrong: 0 });

  const current = phrases[index];
  const isLast = index === phrases.length - 1;
  const sourceLang = current.sourceLang ?? "auto";
  const targetLang = current.targetLang ?? "en";

  const answer = (correct: boolean) => {
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }));
    if (isLast) {
      setStep("done");
    } else {
      setIndex((i) => i + 1);
      setStep("question");
    }
  };

  if (step === "done") {
    const total = score.correct + score.wrong;
    const pct = Math.round((score.correct / total) * 100);
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="text-6xl mb-4">{pct >= 70 ? "🎉" : pct >= 40 ? "📚" : "💪"}</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Practice Complete!</h2>
          <p className="text-slate-500 mb-6">
            You got <strong>{score.correct}</strong> of <strong>{total}</strong> correct ({pct}%)
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setIndex(0); setStep("question"); setScore({ correct: 0, wrong: 0 }); }}
              className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-sm font-medium text-slate-500">
              Card {index + 1} of {phrases.length}
            </span>
            <div className="flex gap-1 mt-1">
              {phrases.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full ${
                    i < index ? "bg-emerald-500" : i === index ? "bg-blue-500" : "bg-slate-200"
                  }`}
                  style={{ width: `${Math.max(8, 200 / phrases.length)}px` }}
                />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center mb-6 min-h-[120px] flex flex-col items-center justify-center">
          <p className="text-xs text-slate-400 mb-3">
            {LANG_FLAGS[sourceLang] ?? "🌐"} {LANG_LABELS[sourceLang] ?? sourceLang}
            {" → "}
            {LANG_FLAGS[targetLang] ?? "🌐"} {LANG_LABELS[targetLang] ?? targetLang}
          </p>
          <p className="text-xl font-semibold text-slate-900">{current.source}</p>
          <p className="text-sm text-slate-400 mt-2">What is the translation?</p>
        </div>

        {step === "question" ? (
          <button
            onClick={() => setStep("reveal")}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Show Translation
          </button>
        ) : (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 text-center">
              <p className="text-sm text-emerald-700 font-medium mb-1">{current.result.translated_text}</p>
              <p className="text-xs text-emerald-600 italic">{current.result.cultural_note.slice(0, 100)}...</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => answer(false)}
                className="flex-1 py-2.5 bg-red-100 text-red-700 font-semibold rounded-xl hover:bg-red-200 transition-colors"
              >
                ✕ Missed it
              </button>
              <button
                onClick={() => answer(true)}
                className="flex-1 py-2.5 bg-emerald-100 text-emerald-700 font-semibold rounded-xl hover:bg-emerald-200 transition-colors"
              >
                ✓ Got it!
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Phrase Card ────────────────────────────────────────────────────────────
function PhraseCard({
  entry,
  onDelete,
  mode,
}: {
  entry: HistoryEntry;
  onDelete: (id: string) => void;
  mode: ViewMode;
}) {
  const [expanded, setExpanded] = useState(false);
  const sourceLang = entry.sourceLang ?? "auto";
  const targetLang = entry.targetLang ?? "en";
  const sourceLangLabel = LANG_LABELS[sourceLang] ?? sourceLang;
  const targetLangLabel = LANG_LABELS[targetLang] ?? targetLang;

  if (mode === "list") {
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-start gap-4 hover:border-blue-200 hover:shadow-sm transition-all">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-medium text-slate-500">
              {LANG_FLAGS[sourceLang] ?? "🌐"} {sourceLangLabel} → {LANG_FLAGS[targetLang] ?? "🌐"} {targetLangLabel}
            </span>
            <span className="text-xs text-slate-400">{formatDate(entry.timestamp)}</span>
          </div>
          <p className="font-semibold text-slate-900 truncate">{entry.source}</p>
          <p className="text-sm text-slate-600 truncate">{entry.result.translated_text}</p>
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          className="text-slate-300 hover:text-red-400 transition-colors text-lg shrink-0"
          title="Remove from phrasebook"
        >
          🗑
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-md transition-all flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
            {LANG_FLAGS[sourceLang] ?? "🌐"} {sourceLangLabel}
          </span>
          <span className="text-slate-300 text-xs">→</span>
          <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
            {LANG_FLAGS[targetLang] ?? "🌐"} {targetLangLabel}
          </span>
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          className="text-slate-200 hover:text-red-400 transition-colors text-base shrink-0"
          title="Remove from phrasebook"
        >
          ✕
        </button>
      </div>

      {/* Phrases */}
      <div className="flex-1">
        <p className="font-semibold text-slate-900 text-base mb-1.5">{entry.source}</p>
        <p className="text-slate-600 text-sm mb-3">{entry.result.translated_text}</p>

        {/* Cultural note snippet */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">🌍 Cultural Note</p>
          <p className="text-xs text-amber-800 leading-relaxed">
            {expanded
              ? entry.result.cultural_note
              : `${entry.result.cultural_note.slice(0, 80)}${entry.result.cultural_note.length > 80 ? "..." : ""}`}
          </p>
          {entry.result.cultural_note.length > 80 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-amber-600 hover:underline mt-1"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <span className="text-xs text-slate-400">{formatDate(entry.timestamp)}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          entry.result.formality_level === "formal"
            ? "bg-blue-50 text-blue-600 border border-blue-200"
            : entry.result.formality_level === "informal"
            ? "bg-amber-50 text-amber-600 border border-amber-200"
            : "bg-slate-50 text-slate-500 border border-slate-200"
        }`}>
          {entry.result.formality_level ?? "neutral"}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function PhrasebookPage() {
  const [phrases, setPhrases] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [practicing, setPracticing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getPhrasebookEntries()
      .then((entries) => {
        if (!cancelled) {
          setPhrases(entries);
          setLoaded(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load your phrasebook.");
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const deletePhrase = useCallback((id: string) => {
    deletePhrasebookEntry(id)
      .then(() => {
        setPhrases((prev) => prev.filter((p) => p.id !== id));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to remove the phrasebook entry.");
      });
  }, []);

  // Unique target languages present in phrasebook
  const uniqueLangs = Array.from(new Set(phrases.map((p) => p.targetLang).filter(Boolean))) as string[];

  const filtered = filter === "all"
    ? phrases
    : phrases.filter((p) => p.targetLang === filter);

  const practiceSet = filtered.length > 0 ? filtered : phrases;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">
            ← TRADUMUST
          </Link>
          <h1 className="font-bold text-slate-900">My Phrasebook</h1>
          <Link href="/translate" className="text-sm text-blue-600 hover:underline font-medium">
            + Add Phrases
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Saved Phrases{" "}
              {loaded && phrases.length > 0 && (
                <span className="text-base font-normal text-slate-400">({phrases.length} total)</span>
              )}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Your personal collection of translations and cultural notes.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Language filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Languages</option>
              {uniqueLangs.map((code) => (
                <option key={code} value={code}>
                  {LANG_FLAGS[code] ?? "🌐"} {LANG_LABELS[code] ?? code}
                </option>
              ))}
            </select>

            {/* View mode toggle */}
            <div className="flex bg-white border border-slate-300 rounded-lg overflow-hidden">
              {(["grid", "list"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-3 py-2 text-sm transition-colors ${
                    viewMode === m ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                  title={`${m} view`}
                >
                  {m === "grid" ? "⊞" : "☰"}
                </button>
              ))}
            </div>

            {/* Practice button */}
            {phrases.length > 0 && (
              <button
                onClick={() => setPracticing(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
              >
                🎯 Practice Mode
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
            <span className="text-red-500 text-lg shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-red-700">Phrasebook unavailable</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Stats bar */}
        {phrases.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Phrases", value: phrases.length, icon: "📝" },
              { label: "Languages", value: uniqueLangs.length, icon: "🌐" },
              {
                label: "This Week",
                value: phrases.filter((p) => Date.now() - p.timestamp < 7 * 24 * 3600 * 1000).length,
                icon: "📅",
              },
              {
                label: "Formal Phrases",
                value: phrases.filter((p) => p.result.formality_level === "formal").length,
                icon: "🎩",
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {!loaded ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-7xl mb-6">📚</div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">
              {phrases.length === 0 ? "Your phrasebook is empty" : `No phrases in ${LANG_LABELS[filter] ?? filter}`}
            </h3>
            <p className="text-slate-500 max-w-md leading-relaxed mb-8">
              {phrases.length === 0
                ? "Start translating to save useful phrases for your exchange program! Every translation can be saved with one click."
                : `Try selecting a different language filter or add more ${LANG_LABELS[filter] ?? filter} phrases.`}
            </p>
            <Link
              href="/translate"
              className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
            >
              🌐 Start Translating
            </Link>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
            {filtered.map((entry) => (
              <PhraseCard key={entry.id} entry={entry} onDelete={deletePhrase} mode={viewMode} />
            ))}
          </div>
        )}
      </div>

      {/* Practice modal */}
      {practicing && (
        <PracticeModal phrases={practiceSet} onClose={() => setPracticing(false)} />
      )}
    </div>
  );
}
