"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useDebounce } from "@/lib/use-debounce";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, Volume2, Globe, Sparkles, AlertCircle, Bookmark, Check, ArrowRight } from "lucide-react";
import { LogoCompact } from "@/components/Logo";
import {
  getTranslationHistory,
  savePhrasebookEntry,
  translateText,
  type HistoryEntry,
  type TranslationResult,
} from "@/lib/api-client";
import { speechService } from "@/lib/speech-service";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: "auto", label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese (Simplified)" },
  { code: "ar", label: "Arabic" },
  { code: "pt", label: "Portuguese" },
  { code: "ko", label: "Korean" },
  { code: "it", label: "Italian" },
];

const TARGET_LANGUAGES = LANGUAGES.filter((l) => l.code !== "auto");

// ── Sub-components ─────────────────────────────────────────────────────────
function FormalityBadge({ level }: { level: TranslationResult["formality_level"] }) {
  const styles = {
    formal:   "bg-blue-50   dark:bg-blue-500/20   text-blue-700   dark:text-blue-300   border-blue-200   dark:border-blue-500/30   shadow-[0_0_10px_rgba(59,130,246,0.08)]  dark:shadow-[0_0_10px_rgba(59,130,246,0.2)]",
    informal: "bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.08)]  dark:shadow-[0_0_10px_rgba(249,115,22,0.2)]",
    neutral:  "bg-slate-100 dark:bg-slate-500/30  text-slate-600  dark:text-slate-300  border-slate-200  dark:border-slate-500/40",
  };
  const labels = { formal: "Formal Register", informal: "Informal Register", neutral: "Neutral Register" };
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

function CulturalNoteBox({ result }: { result: TranslationResult }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-6 rounded-2xl border border-amber-400/30 dark:border-amber-500/30 overflow-hidden shadow-lg shadow-amber-500/5 relative cultural-note-card"
    >
      <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600 h-full" />
      <div className="flex items-start gap-4 p-5">
        <div className="p-2 bg-amber-500/15 dark:bg-amber-500/20 rounded-xl border border-amber-400/25 dark:border-amber-500/30 shrink-0 mt-1">
          <Globe className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="font-bold text-[var(--cultural-label)] text-sm tracking-wide">Cultural Context</span>
            <FormalityBadge level={result.formality_level} />
            <span className="text-xs font-semibold text-[var(--cultural-label)] bg-amber-500/15 px-3 py-1 rounded-full border border-amber-400/25">
              {result.regional_variant}
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{result.cultural_note}</p>
        </div>
      </div>

      {result.formality_detail && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-5 py-3 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors border-t border-amber-400/20 dark:border-amber-500/20 text-left group"
          >
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300 group-hover:text-amber-800 dark:group-hover:text-amber-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Why this translation works — formality explained
            </span>
            <span className="text-amber-600 dark:text-amber-400 text-lg leading-none">{expanded ? "−" : "+"}</span>
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-5 py-4 bg-amber-50/60 dark:bg-amber-950/40 border-t border-amber-400/20 dark:border-amber-500/20"
              >
                <p className="text-sm text-amber-900/70 dark:text-amber-100/70 leading-relaxed italic border-l-2 border-amber-500/40 pl-3 ml-2">{result.formality_detail}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function TranslatePage() {
  const [activeTab, setActiveTab] = useState<"text" | "voice">("text");
  const [inputText, setInputText] = useState("Hello, how are you?");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("fr");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingPhrasebook, setSavingPhrasebook] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<HistoryEntry | null>(null);

  const debouncedInput = useDebounce(inputText, 500);
  const debouncedTarget = useDebounce(targetLang, 300);
  const [savedToPhrasebook, setSavedToPhrasebook] = useState(false);
  const [recentTranslations, setRecentTranslations] = useState<HistoryEntry[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speakLoading, setSpeakLoading] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const MAX_CHARS = 500;

  useEffect(() => {
    let cancelled = false;
    getTranslationHistory(10)
      .then((entries) => { if (!cancelled) setRecentTranslations(entries); })
      .catch(() => { if (!cancelled) setRecentTranslations([]); });

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices(); };
    }
    return () => { cancelled = true; if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  useEffect(() => {
    if (debouncedInput.trim()) handleTranslate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedInput, debouncedTarget]);

  const saveRecent = useCallback((entry: HistoryEntry) => {
    setRecentTranslations((prev) => [entry, ...prev.filter((t) => t.id !== entry.id)].slice(0, 10));
  }, []);

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    setSavedToPhrasebook(false);

    try {
      const response = await translateText({ text: inputText, source_lang: sourceLang, target_lang: targetLang });
      const { history_entry, ...translation } = response;
      setResult(translation);
      if (history_entry) {
        setCurrentEntry(history_entry);
        setSavedToPhrasebook(history_entry.isPhrasebook);
        saveRecent(history_entry);
      } else {
        setCurrentEntry(null);
        setSavedToPhrasebook(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed. Check your connection.");
      setResult(null);
      setCurrentEntry(null);
    } finally {
      setLoading(false);
    }
  }, [inputText, sourceLang, targetLang, saveRecent]);

  const saveToPhrasebook = async () => {
    if (!currentEntry || savedToPhrasebook) return;
    setSavingPhrasebook(true);
    try {
      const response = await savePhrasebookEntry(currentEntry.id);
      setSavedToPhrasebook(true);
      setCurrentEntry(response.entry);
      setRecentTranslations((prev) => prev.map((e) => (e.id === response.entry.id ? response.entry : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving to phrasebook failed.");
    } finally {
      setSavingPhrasebook(false);
    }
  };

  const speakAloud = () => {
    if (!result) return;
    speechService.speak(result.translated_text, targetLang);
  };

  const toggleListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Speech recognition is not supported in your browser."); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    const langMap: Record<string, string> = { fr: "fr-FR", es: "es-ES", de: "de-DE", ja: "ja-JP", zh: "zh-CN", ar: "ar-SA", pt: "pt-BR", ko: "ko-KR", it: "it-IT", en: "en-US", auto: "en-US" };
    recognition.lang = langMap[sourceLang] ?? "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e: any) => { if (e.results[0]?.[0]) setInputText(e.results[0][0].transcript); setIsListening(false); };
    recognition.onerror = (e: any) => { console.error(e.error); setIsListening(false); };
    recognition.onend = () => setIsListening(false);
    try { recognition.start(); setIsListening(true); } catch { setIsListening(false); }
  };

  return (
    <div className="page-shell font-sans relative">
      {/* Decorative background blobs — subtle for light, richer for dark */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/8 dark:bg-blue-900/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-400/8 dark:bg-purple-900/20 blur-[150px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="glass-panel px-6 py-4 sticky top-0 z-40 border-b border-[var(--panel-border)] rounded-b-none shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <LogoCompact />
          </Link>
          <h1 className="font-bold text-lg hidden sm:block text-[var(--foreground)]">Translation Studio</h1>
          <Link href="/phrasebook" className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors bg-purple-500/10 px-4 py-2 rounded-full border border-purple-400/20 dark:border-purple-500/20 hover:border-purple-400/40 relative overflow-hidden group">
            <div className="absolute inset-0 bg-purple-500/10 w-0 group-hover:w-full transition-all duration-300" />
            <BookOpen className="w-4 h-4" />
            <span>Phrasebook</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col lg:flex-row gap-8 relative z-10 w-full overflow-hidden">
        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">

          {/* Tab Switch */}
          <div className="flex p-1 tab-bar rounded-2xl w-fit shadow-sm">
            {(["text", "voice"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-semibold transition-all relative flex items-center gap-2",
                  activeTab === tab
                    ? "text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
              >
                {activeTab === tab && (
                  <motion.div layoutId="tab-bg" className="absolute inset-0 bg-blue-600 rounded-xl" style={{ zIndex: -1 }} />
                )}
                {tab === "text" ? "✍️ Text" : "🎤 Voice"}
              </button>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-3xl relative">
            {/* Language Selectors */}
            <div className="flex items-center gap-4 mb-6">
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="theme-select flex-1 min-w-[140px] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none hover:border-[var(--brand-primary)]/40 transition-colors"
                style={{ WebkitAppearance: "none", MozAppearance: "none" }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>

              <button
                onClick={() => { const s = sourceLang === "auto" ? "en" : sourceLang; setSourceLang(targetLang); setTargetLang(s); }}
                className="p-3 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl hover:bg-[var(--surface)] transition-colors text-[var(--foreground)] group shadow-sm"
              >
                <ArrowRight className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
              </button>

              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="theme-select flex-1 min-w-[140px] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none hover:border-[var(--brand-primary)]/40 transition-colors"
                style={{ WebkitAppearance: "none", MozAppearance: "none" }}
              >
                {TARGET_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Input Area */}
            <div className="bg-[var(--input-bg)] rounded-2xl border border-[var(--panel-border)] overflow-hidden transition-all focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/30 shadow-inner block">
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value.slice(0, MAX_CHARS))}
                  placeholder="Type or paste text to translate..."
                  className="w-full p-5 bg-transparent text-[var(--foreground)] resize-none focus:outline-none text-lg leading-relaxed min-h-[140px] placeholder:text-[var(--text-muted)]"
                  rows={5}
                />
                <AnimatePresence>
                  {activeTab === "voice" && (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={toggleListening}
                      className={cn(
                        "absolute top-4 right-4 p-3.5 rounded-full transition-all shadow-xl",
                        isListening
                          ? "bg-red-500 text-white animate-pulse"
                          : "bg-[var(--panel-bg)] text-[var(--foreground)] hover:bg-blue-600 hover:text-white border border-[var(--panel-border)]"
                      )}
                    >
                      <Volume2 className="w-5 h-5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center justify-between px-5 py-3 bg-[var(--surface)] border-t border-[var(--panel-border)]">
                <span className={cn("text-xs font-medium", inputText.length > MAX_CHARS * 0.9 ? "text-red-500" : "text-[var(--text-muted)]")}>
                  {inputText.length} / {MAX_CHARS}
                </span>
                {isListening && (
                  <span className="text-xs text-red-500 font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Listening...
                  </span>
                )}
                <button
                  onClick={() => { setInputText(""); setResult(null); setCurrentEntry(null); setSavedToPhrasebook(false); }}
                  className="text-xs font-semibold text-[var(--text-muted)] hover:text-red-500 transition-colors uppercase tracking-wider bg-[var(--panel-bg)] border border-[var(--panel-border)] px-3 py-1 rounded"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4">
                  <div className="error-alert flex items-start gap-3 rounded-2xl px-5 py-4">
                    <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-bold text-[var(--error-title)]">Translation failed</p>
                      <p className="text-sm text-[var(--error-body)] mt-1">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-500 text-sm">✕</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Loader or Result */}
          <AnimatePresence mode="popLayout">
            {loading && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-[var(--panel-border)] border-t-blue-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.25)]" />
              </motion.div>
            )}

            {!loading && result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="relative">
                <div className="glass-panel result-card p-8 rounded-3xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/8 dark:bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-400/20 dark:border-blue-500/20">
                      <Sparkles className="w-3 h-3 animate-pulse" /> Translation
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={speakAloud}
                        disabled={speakLoading}
                        className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] hover:bg-[var(--surface)] text-[var(--foreground)] transition-all disabled:opacity-50 shadow-sm"
                      >
                        <Volume2 className={cn("w-4 h-4", speakLoading && "animate-pulse text-blue-500")} />
                        {speakLoading ? "Speaking" : "Listen"}
                      </button>

                      <button
                        onClick={saveToPhrasebook}
                        disabled={savedToPhrasebook || savingPhrasebook}
                        className={cn(
                          "flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all border shadow-sm",
                          savedToPhrasebook
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-400/30 dark:border-emerald-500/30"
                            : "bg-[var(--panel-bg)] hover:bg-[var(--surface)] border-[var(--panel-border)] text-[var(--foreground)]"
                        )}
                      >
                        {savedToPhrasebook ? <><Check className="w-4 h-4" /> Saved</> : <><Bookmark className="w-4 h-4" /> Save</>}
                      </button>
                    </div>
                  </div>

                  <p className="text-3xl md:text-4xl text-[var(--foreground)] font-medium leading-relaxed mb-4 relative z-10">
                    {result.translated_text}
                  </p>

                  <CulturalNoteBox result={result} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Sidebar ── */}
        <aside className="w-80 shrink-0 hidden lg:block">
          <div className="glass-panel p-6 sticky top-28 rounded-3xl">
            <h3 className="font-bold text-[var(--foreground)] mb-6 flex items-center gap-2 text-lg">
              History
            </h3>
            {recentTranslations.length === 0 ? (
              <div className="text-center py-10 bg-[var(--surface)] rounded-2xl border border-[var(--panel-border)]">
                <div className="text-4xl mb-3 opacity-50">📝</div>
                <p className="text-sm text-[var(--text-muted)]">Your recent translations will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTranslations.slice(0, 6).map((item) => {
                  const targetLabel = LANGUAGES.find((l) => l.code === item.targetLang)?.label ?? item.targetLang;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setInputText(item.source);
                        setSourceLang(item.sourceLang ?? "auto");
                        setTargetLang(item.targetLang ?? targetLang);
                        setResult(item.result);
                        setCurrentEntry(item);
                        setSavedToPhrasebook(item.isPhrasebook);
                      }}
                      className="list-item w-full text-left p-4 rounded-2xl hover:border-blue-400/25 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <p className="text-sm text-[var(--foreground)] font-medium truncate mb-1">{item.source}</p>
                      <p className="text-xs text-[var(--text-secondary)] truncate mb-2">{item.result.translated_text}</p>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-400/20 dark:border-blue-500/20 inline-block">
                        {targetLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
