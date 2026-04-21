"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Check, X, LayoutGrid, List as ListIcon,
  Loader2, Brain, Zap, RefreshCw, Volume2, HandMetal,
  BookOpen, Play, ChevronLeft, ChevronRight, RotateCcw,
  Globe, TrendingUp,
} from "lucide-react";
import {
  deletePhrasebookEntry, getPhrasebookEntries,
  patchPhrasebookSrs, type HistoryEntry,
} from "@/lib/api-client";
import { Signer2D } from "@/components/Signer2D";
import { speechService } from "@/lib/speech-service";
import { cn } from "@/lib/utils";
import { LogoCompact } from "@/components/Logo";

// ── Types ──────────────────────────────────────────────────────────────────
type ViewMode    = "grid" | "list";
type PracticeStep = "question" | "reveal" | "done";
type Section     = "phrases" | "signs";

// ── Helpers ────────────────────────────────────────────────────────────────
const LANG_LABELS: Record<string, string> = {
  auto: "Auto", en: "English", fr: "French", es: "Spanish", de: "German",
  ja: "Japanese", zh: "Chinese", ar: "Arabic", pt: "Portuguese",
  ko: "Korean", it: "Italian",
};
const LANG_FLAGS: Record<string, string> = {
  en: "EN", fr: "FR", es: "ES", de: "DE", ja: "JA",
  zh: "ZH", ar: "AR", pt: "PT", ko: "KO", it: "IT",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function sentimentLabel(polarity: number) {
  if (polarity >  0.15) return { label: "Positive", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" };
  if (polarity < -0.15) return { label: "Negative", color: "text-red-600 dark:text-red-400",     bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" };
  return                        { label: "Neutral",  color: "text-[var(--text-muted)]",           bg: "bg-[var(--tag-bg)] border-[var(--tag-border)]" };
}

// ── SRS ────────────────────────────────────────────────────────────────────
function calculateNextReview(rating: number, currentSrs: any) {
  let { interval = 0, easiness = 2.5, repetitions = 0 } = currentSrs || {};
  if (rating >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 4;
    else interval = Math.round(interval * easiness);
    repetitions++;
  } else { repetitions = 0; interval = 1; }
  easiness = Math.max(1.3, easiness + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)));
  return { interval, easiness, repetitions, next_review: Date.now() + interval * 86400000 };
}

// ── Sign Practice Modal ────────────────────────────────────────────────────
function SignPracticeModal({ entry, onClose }: { entry: HistoryEntry; onClose: () => void }) {
  const words    = entry.wordSequence?.length ? entry.wordSequence : (entry.extra.word_sequence ?? []);
  const metadata = entry.metadata ?? [];
  const [idx, setIdx]       = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentWord = words[idx] ?? "";
  const currentTag  = metadata.find(m => m.word?.toUpperCase() === currentWord.toUpperCase())?.tag ?? "ACTION";

  const stopTimer = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  const playSequence = useCallback(() => {
    setPlaying(true);
    setIdx(0);
    let i = 0;
    const step = () => {
      setIdx(i);
      if (i < words.length - 1) {
        timerRef.current = setTimeout(() => { i++; step(); }, 1100);
      } else {
        timerRef.current = setTimeout(() => setPlaying(false), 1100);
      }
    };
    step();
  }, [words]);

  useEffect(() => () => stopTimer(), []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1,    opacity: 1, y: 0 }}
        exit={{ scale: 0.95,    opacity: 0, y: 20 }}
        className="relative z-10 glass-panel w-full max-w-lg rounded-[2.5rem] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-purple-500 mb-0.5">Sign Practice</p>
            <h3 className="font-black text-xl text-[var(--foreground)] leading-tight">{entry.source}</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-[var(--surface)] rounded-full border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Signer canvas — dark by design for video/3D contrast */}
        <div className="mx-6 rounded-2xl bg-slate-950 border border-white/5 overflow-hidden relative" style={{ height: 240 }}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-center h-full">
            <Signer2D word={currentWord} tag={currentTag} className="w-72 h-56" />
          </div>
          {playing && (
            <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">Signing</span>
            </div>
          )}
        </div>

        {/* Word sequence chips */}
        <div className="px-6 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">ASL Gloss</p>
          <div className="flex flex-wrap gap-2">
            {words.map((w, i) => (
              <button
                key={i}
                onClick={() => { stopTimer(); setPlaying(false); setIdx(i); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border",
                  i === idx
                    ? "bg-purple-500 text-white border-purple-400 shadow-sm shadow-purple-500/30"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--panel-border)] hover:border-purple-400/40"
                )}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 pb-6 flex items-center gap-3">
          <button
            onClick={() => { stopTimer(); setPlaying(false); setIdx(i => Math.max(0, i - 1)); }}
            disabled={idx === 0}
            className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--foreground)] disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => { stopTimer(); setPlaying(false); setIdx(i => Math.min(words.length - 1, i + 1)); }}
            disabled={idx === words.length - 1}
            className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--foreground)] disabled:opacity-30 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => { stopTimer(); setPlaying(false); setIdx(0); }}
            className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-all"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={() => { stopTimer(); playSequence(); }}
            disabled={words.length === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/20"
          >
            <Play className="w-4 h-4" />
            {playing ? "Playing…" : "Play Full Sign"}
          </button>
        </div>

        {/* Word counter */}
        <div className="px-6 pb-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          <span>Word {idx + 1} / {words.length}</span>
          {entry.sentiment && (() => { const s = sentimentLabel(entry.sentiment.polarity); return <span className={cn("px-2 py-1 rounded border text-[9px]", s.bg, s.color)}>{s.label}</span>; })()}
        </div>
      </motion.div>
    </div>
  );
}

// ── Phrase Practice Modal (SRS) ────────────────────────────────────────────
function PracticeModal({ phrases, onClose, onUpdated }: { phrases: HistoryEntry[]; onClose: () => void; onUpdated: () => void }) {
  const [index, setIndex] = useState(0);
  const [step, setStep]   = useState<PracticeStep>("question");

  const current = phrases[index];
  const isLast  = index === phrases.length - 1;

  const answer = async (rating: number) => {
    const srsData = calculateNextReview(rating, current.extra?.srs);
    await patchPhrasebookSrs(current.id, { ...current.extra, srs: srsData });
    if (isLast) { setStep("done"); onUpdated(); }
    else { setIndex(i => i + 1); setStep("question"); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl" onClick={onClose} />
      <AnimatePresence mode="wait">
        {step === "done" ? (
          <motion.div key="done" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 glass-panel max-w-md w-full p-10 rounded-[3rem] text-center">
            <div className="text-6xl mb-6">🧠</div>
            <h2 className="text-3xl font-black text-[var(--foreground)] mb-2">Knowledge Refreshed</h2>
            <p className="text-[var(--text-secondary)] mb-8">Review session complete. Your memory is optimised for these phrases.</p>
            <button onClick={onClose} className="w-full py-4 bg-brand-primary text-white font-bold rounded-2xl shadow-lg shadow-brand-primary/20 hover:opacity-90 transition-opacity">
              Return to Phrasebook
            </button>
          </motion.div>
        ) : (
          <motion.div key="quiz" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="relative z-10 glass-panel max-w-xl w-full p-8 rounded-[3rem]">
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Reviewing {index + 1} of {phrases.length}</span>
              <button onClick={onClose} className="p-2 bg-[var(--surface)] rounded-full border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-[var(--surface-deep)] rounded-3xl border border-[var(--panel-border)] p-10 text-center mb-8 min-h-[180px] flex items-center justify-center">
              <p className="text-3xl font-bold text-[var(--foreground)] leading-tight">{current.source}</p>
            </div>
            <AnimatePresence mode="wait">
              {step === "question" ? (
                <motion.button key="rev" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setStep("reveal")} className="w-full py-5 bg-[var(--foreground)] text-[var(--background)] font-black rounded-2xl shadow-xl active:scale-95 transition-all text-lg hover:opacity-90">
                  Reveal Translation
                </motion.button>
              ) : (
                <motion.div key="ans" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  <div className="p-6 rounded-3xl bg-brand-primary/8 border border-brand-primary/15 text-center relative">
                    <button onClick={() => speechService.speak(current.result.translated_text, current.targetLang || "en")} className="absolute top-4 right-4 p-2 bg-brand-primary/15 rounded-full hover:bg-brand-primary/25 text-brand-primary transition-colors">
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <p className="text-2xl font-bold text-brand-primary mb-2">{current.result.translated_text}</p>
                    <p className="text-xs text-[var(--text-muted)] italic">"{current.result.cultural_note}"</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => answer(1)} className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all flex flex-col items-center gap-2 pt-5">
                      <RefreshCw className="w-4 h-4" /> Again
                    </button>
                    <button onClick={() => answer(3)} className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all flex flex-col items-center gap-2 pt-5">
                      <Zap className="w-4 h-4" /> Hard
                    </button>
                    <button onClick={() => answer(5)} className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all flex flex-col items-center gap-2 pt-5">
                      <Check className="w-4 h-4" /> Easy
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sign Card ──────────────────────────────────────────────────────────────
function SignCard({ entry, onDelete }: { entry: HistoryEntry; onDelete: () => void }) {
  const [practising, setPractising] = useState(false);
  const words = entry.wordSequence?.length ? entry.wordSequence : (entry.extra.word_sequence ?? []);
  const s     = entry.sentiment ? sentimentLabel(entry.sentiment.polarity) : null;

  return (
    <>
      <motion.div layout key={entry.id} className="phrase-card p-6 rounded-3xl hover:border-purple-400/25 transition-all group relative">
        {/* Top row */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2.5 py-1 rounded-lg border border-purple-400/20 dark:border-purple-500/20">
              {entry.signLanguage ?? "ASL"}
            </span>
            {s && (
              <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border", s.bg, s.color)}>
                {s.label}
              </span>
            )}
          </div>
          <button onClick={onDelete} className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Original text */}
        <h3 className="text-lg font-bold text-[var(--foreground)] mb-3 leading-snug">{entry.source}</h3>

        {/* ASL gloss chips */}
        {words.length > 0 && (
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">ASL Gloss</p>
            <div className="flex flex-wrap gap-1.5">
              {words.map((w, i) => (
                <span key={i} className="px-2.5 py-1 bg-[var(--surface-deep)] border border-[var(--panel-border)] rounded-lg text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata tags row */}
        {entry.metadata?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {entry.metadata.slice(0, 5).map((m, i) => {
              const tagColor: Record<string, string> = {
                SUBJECT:  "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
                ACTION:   "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20",
                OBJECT:   "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
                MODIFIER: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
                TIME:     "text-slate-500 bg-[var(--tag-bg)] border-[var(--tag-border)]",
              };
              return (
                <span key={i} className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border", tagColor[m.tag] ?? tagColor.TIME)}>
                  {m.tag}
                </span>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-[var(--panel-border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{formatDate(entry.timestamp)}</span>
            <div className="flex items-center gap-1">
              <Brain className={cn("w-3 h-3", entry.extra.srs?.repetitions ? "text-emerald-500" : "text-[var(--text-muted)]")} />
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Mem: {entry.extra.srs?.repetitions || 0}</span>
            </div>
          </div>
          <button
            onClick={() => setPractising(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/15 px-3 py-1.5 rounded-lg border border-purple-400/20 transition-all"
          >
            <Play className="w-3 h-3" /> Practice
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {practising && (
          <SignPracticeModal entry={entry} onClose={() => setPractising(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Phrase Card ────────────────────────────────────────────────────────────
function PhraseCard({ entry, onDelete }: { entry: HistoryEntry; onDelete: () => void }) {
  return (
    <motion.div layout key={entry.id} className="phrase-card p-6 rounded-3xl hover:border-brand-primary/20 transition-all group relative flex flex-col">
      {/* Top row */}
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-bold tracking-widest uppercase bg-[var(--tag-bg)] text-[var(--tag-text)] px-2.5 py-1 rounded-lg border border-[var(--tag-border)]">
          {LANG_FLAGS[entry.targetLang || ""] ?? "??"}
        </span>
        <button onClick={onDelete} className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <h3 className="text-xl font-bold text-[var(--foreground)] mb-1">{entry.source}</h3>
      <p className="text-brand-primary font-semibold mb-4 text-base">{entry.result.translated_text}</p>

      {entry.result.cultural_note && (
        <div className="p-4 rounded-2xl bg-[var(--cultural-bg)] border border-amber-400/20 dark:border-amber-500/20 text-[11px] leading-relaxed text-[var(--text-secondary)] mb-4 flex-1">
          <span className="text-[var(--cultural-label)] font-bold block mb-1 text-[10px] uppercase tracking-wider">Cultural Note</span>
          {entry.result.cultural_note}
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-[var(--panel-border)] flex items-center justify-between">
        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{formatDate(entry.timestamp)}</span>
        <div className="flex items-center gap-1.5">
          <Brain className={cn("w-3 h-3", entry.extra.srs?.repetitions ? "text-emerald-500" : "text-[var(--text-muted)]")} />
          <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Mem: {entry.extra.srs?.repetitions || 0}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function PhrasebookPage() {
  const [allEntries, setAllEntries]   = useState<HistoryEntry[]>([]);
  const [section, setSection]         = useState<Section>("phrases");
  const [langFilter, setLangFilter]   = useState("all");
  const [viewMode, setViewMode]       = useState<ViewMode>("grid");
  const [practicing, setPracticing]   = useState(false);
  const [loaded, setLoaded]           = useState(false);

  const refreshData = useCallback(() => {
    getPhrasebookEntries().then(data => { setAllEntries(data); setLoaded(true); });
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  // Split by entry type
  const phraseEntries = allEntries.filter(e => e.entry_type === "translation");
  const signEntries   = allEntries.filter(e => e.entry_type === "sign_expression");

  // Due for review (phrases only for SRS)
  const duePhrases = phraseEntries.filter(p => !p.extra.srs?.next_review || p.extra.srs.next_review < Date.now());

  // Unique languages for filter chips (phrases section)
  const uniqueLangs = Array.from(new Set(phraseEntries.map(p => p.targetLang).filter(Boolean))) as string[];

  // Filtered lists
  const filteredPhrases = langFilter === "all" ? phraseEntries : phraseEntries.filter(p => p.targetLang === langFilter);
  const filteredSigns   = signEntries; // could add sign-language filter later

  // Derived stats
  const masteredCount = allEntries.filter(e => (e.extra.srs?.repetitions ?? 0) >= 3).length;

  const activeList = section === "phrases" ? filteredPhrases : filteredSigns;
  const isEmpty    = loaded && activeList.length === 0;

  return (
    <div className="page-shell font-sans relative">
      {/* Decorative blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/6 dark:bg-indigo-900/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-400/6 dark:bg-purple-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* ── Header ── */}
      <header className="glass-panel px-6 py-4 sticky top-0 z-40 border-b border-[var(--panel-border)] rounded-b-none shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <LogoCompact />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/sign" className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 bg-purple-500/10 px-4 py-2 rounded-full border border-purple-400/20 transition-colors">
              <HandMetal className="w-3 h-3" /> Sign Studio
            </Link>
            <Link href="/translate" className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-400/20 transition-colors">
              <Globe className="w-3 h-3" /> Translate
            </Link>
            {duePhrases.length > 0 && (
              <button onClick={() => setPracticing(true)} className="flex items-center gap-2 bg-brand-primary text-white font-bold px-4 py-2 rounded-full text-xs shadow-lg shadow-brand-primary/20 hover:scale-105 transition-transform">
                <Brain className="w-3 h-3" /> Review {duePhrases.length} Due
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10 w-full">

        {/* ── Page Title ── */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-[var(--foreground)] mb-2 tracking-tighter">Your Phrasebook</h1>
            <p className="text-[var(--text-secondary)]">Saved phrases and signs — practice with spaced repetition.</p>
          </div>
          <div className="flex items-center gap-2 bg-[var(--panel-bg)] border border-[var(--panel-border)] p-1 rounded-2xl">
            <button onClick={() => setViewMode("grid")} className={cn("p-2 rounded-xl transition-all", viewMode === "grid" ? "bg-[var(--brand-primary)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--foreground)]")}>
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button onClick={() => setViewMode("list")} className={cn("p-2 rounded-xl transition-all", viewMode === "list" ? "bg-[var(--brand-primary)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--foreground)]")}>
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="phrase-card p-6 rounded-[2rem]">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-[var(--brand-primary)]" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Phrases</p>
            </div>
            <p className="text-4xl font-black text-[var(--foreground)]">{phraseEntries.length}</p>
          </div>
          <div className="phrase-card p-6 rounded-[2rem]">
            <div className="flex items-center gap-2 mb-2">
              <HandMetal className="w-4 h-4 text-purple-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Signs</p>
            </div>
            <p className="text-4xl font-black text-purple-600 dark:text-purple-400">{signEntries.length}</p>
          </div>
          <div className="phrase-card p-6 rounded-[2rem]">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-brand-primary" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Due Review</p>
            </div>
            <p className="text-4xl font-black text-brand-primary">{duePhrases.length}</p>
          </div>
          <div className="phrase-card p-6 rounded-[2rem]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Mastered</p>
            </div>
            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{masteredCount}</p>
          </div>
        </div>

        {/* ── Section Tabs ── */}
        <div className="flex items-center gap-1 p-1 tab-bar rounded-2xl w-fit mb-8 shadow-sm">
          <button
            onClick={() => { setSection("phrases"); setLangFilter("all"); }}
            className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all relative", section === "phrases" ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]")}
          >
            {section === "phrases" && <motion.div layoutId="section-tab" className="absolute inset-0 bg-blue-600 rounded-xl" style={{ zIndex: -1 }} />}
            <BookOpen className="w-4 h-4" /> Phrases
            {phraseEntries.length > 0 && (
              <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded-md", section === "phrases" ? "bg-white/25 text-white" : "bg-[var(--surface)] text-[var(--text-muted)]")}>
                {phraseEntries.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSection("signs")}
            className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all relative", section === "signs" ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]")}
          >
            {section === "signs" && <motion.div layoutId="section-tab" className="absolute inset-0 bg-purple-600 rounded-xl" style={{ zIndex: -1 }} />}
            <HandMetal className="w-4 h-4" /> Sign Language
            {signEntries.length > 0 && (
              <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded-md", section === "signs" ? "bg-white/25 text-white" : "bg-[var(--surface)] text-[var(--text-muted)]")}>
                {signEntries.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Language filter (phrases only) ── */}
        <AnimatePresence>
          {section === "phrases" && uniqueLangs.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-2 mb-6">
              {["all", ...uniqueLangs].map(lang => (
                <button
                  key={lang}
                  onClick={() => setLangFilter(lang)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border",
                    langFilter === lang
                      ? "bg-brand-primary text-white border-transparent shadow-sm"
                      : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--panel-border)] hover:text-[var(--foreground)]"
                  )}
                >
                  {lang === "all" ? "All Languages" : (LANG_LABELS[lang] ?? lang)}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Content ── */}
        {!loaded ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
          </div>

        ) : isEmpty ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-28 glass-panel rounded-[3rem] border border-dashed border-[var(--panel-border)]">
            <div className="text-6xl mb-4">{section === "phrases" ? "📚" : "🤟"}</div>
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
              {section === "phrases" ? "No saved phrases yet" : "No saved signs yet"}
            </h3>
            <p className="text-[var(--text-muted)] mb-8 max-w-xs mx-auto leading-relaxed">
              {section === "phrases"
                ? "Translate something and hit Save to build your library."
                : "Animate signs in the Sign Studio and save them here to practice."}
            </p>
            <Link
              href={section === "phrases" ? "/translate" : "/sign"}
              className={cn(
                "inline-flex items-center gap-2 text-white font-bold px-8 py-3 rounded-full hover:opacity-90 transition-opacity",
                section === "phrases" ? "bg-brand-primary" : "bg-purple-600"
              )}
            >
              {section === "phrases" ? <><Globe className="w-4 h-4" /> Go to Translate</> : <><HandMetal className="w-4 h-4" /> Go to Sign Studio</>}
            </Link>
          </motion.div>

        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
              className={cn("grid gap-6", viewMode === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : "max-w-4xl mx-auto")}
            >
              {section === "phrases"
                ? filteredPhrases.map(entry => (
                    <PhraseCard key={entry.id} entry={entry} onDelete={() => deletePhrasebookEntry(entry.id).then(refreshData)} />
                  ))
                : filteredSigns.map(entry => (
                    <SignCard key={entry.id} entry={entry} onDelete={() => deletePhrasebookEntry(entry.id).then(refreshData)} />
                  ))
              }
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {practicing && (
        <PracticeModal phrases={duePhrases} onClose={() => setPracticing(false)} onUpdated={refreshData} />
      )}
    </div>
  );
}
