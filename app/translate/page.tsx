"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useDebounce } from "@/lib/use-debounce";
import Link from "next/link";
import {
  getTranslationHistory,
  savePhrasebookEntry,
  translateText,
  type HistoryEntry,
  type TranslationResult,
} from "@/lib/api-client";

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

// Mock translation logic has been removed to integrate actual real data API.
// ── Sub-components ─────────────────────────────────────────────────────────
function FormalityBadge({ level }: { level: TranslationResult["formality_level"] }) {
  const styles = {
    formal: "bg-blue-100 text-blue-700 border-blue-200",
    informal: "bg-amber-100 text-amber-700 border-amber-200",
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const labels = { formal: "Formal Register", informal: "Informal Register", neutral: "Neutral Register" };
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

function CulturalNoteBox({ result }: { result: TranslationResult }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <span className="text-xl shrink-0 mt-0.5">🌍</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-amber-800 text-sm">Cultural Context</span>
            <FormalityBadge level={result.formality_level} />
            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
              {result.regional_variant}
            </span>
          </div>
          <p className="text-sm text-amber-900 leading-relaxed">{result.cultural_note}</p>
        </div>
      </div>

      {result.formality_detail && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-100/60 hover:bg-amber-100 transition-colors border-t border-amber-200 text-left"
          >
            <span className="text-sm font-medium text-amber-800">
              📚 Why this translation works — formality explained
            </span>
            <span className="text-amber-600 text-lg leading-none">{expanded ? "−" : "+"}</span>
          </button>
          {expanded && (
            <div className="px-4 py-4 bg-amber-50 border-t border-amber-200">
              <p className="text-sm text-amber-900 leading-relaxed">{result.formality_detail}</p>
            </div>
          )}
        </>
      )}
    </div>
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

  // Real-time: debounce input + target lang changes → auto-translate
  const debouncedInput = useDebounce(inputText, 500);
  const debouncedTarget = useDebounce(targetLang, 300);
  const [savedToPhrasebook, setSavedToPhrasebook] = useState(false);
  const [recentTranslations, setRecentTranslations] = useState<HistoryEntry[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speakLoading, setSpeakLoading] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const MAX_CHARS = 500;

  // Load recent history from the backend and preload speechSynthesis voices
  useEffect(() => {
    let cancelled = false;

    getTranslationHistory(10)
      .then((entries) => {
        if (!cancelled) {
          setRecentTranslations(entries);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecentTranslations([]);
        }
      });

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Auto-translate whenever debounced input or target language changes
  useEffect(() => {
    if (debouncedInput.trim()) {
      handleTranslate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedInput, debouncedTarget]);

  const saveRecent = useCallback((entry: HistoryEntry) => {
    setRecentTranslations((prev) => [entry, ...prev.filter((t) => t.id !== entry.id)].slice(0, 10));
  }, []);

  // ── Translate ────────────────────────────────────────────────────────────
  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    setSavedToPhrasebook(false);

    try {
      const response = await translateText({
        text: inputText,
        source_lang: sourceLang,
        target_lang: targetLang,
      });

      const { history_entry, ...translation } = response;
      setResult(translation);
      setCurrentEntry(history_entry);
      setSavedToPhrasebook(history_entry.isPhrasebook);
      saveRecent(history_entry);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed. Check your connection and try again.");
      setResult(null);
      setCurrentEntry(null);
    } finally {
      setLoading(false);
    }
  }, [inputText, sourceLang, targetLang, saveRecent]);

  // ── Save to Phrasebook ────────────────────────────────────────────────────
  const saveToPhrasebook = async () => {
    if (!currentEntry || savedToPhrasebook) return;
    setSavingPhrasebook(true);
    try {
      const response = await savePhrasebookEntry(currentEntry.id);
      setSavedToPhrasebook(true);
      setCurrentEntry(response.entry);
      setRecentTranslations((prev) =>
        prev.map((entry) => (entry.id === response.entry.id ? response.entry : entry))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving to phrasebook failed.");
    } finally {
      setSavingPhrasebook(false);
    }
  };

  // ── Speak Aloud ────────────────────────────────────────────────────────────
  const speakAloud = () => {
    if (!result) return;
    setSpeakLoading(true);
    const utterance = new SpeechSynthesisUtterance(result.translated_text);
    const langMap: Record<string, string> = {
      fr: "fr-FR", es: "es-ES", de: "de-DE", ja: "ja-JP",
      zh: "zh-CN", ar: "ar-SA", pt: "pt-BR", ko: "ko-KR",
      it: "it-IT", en: "en-US",
    };
    const targetLangCode = langMap[targetLang] ?? "en-US";
    utterance.lang = targetLangCode;

    // Try to pick a high-quality, natural-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = targetLangCode.split('-')[0].toLowerCase();
    
    // Filter voices that match the language (case-insensitive prefix match)
    const matchingVoices = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
    
    if (matchingVoices.length > 0) {
      // Prefer Premium, Natural, Google, or Microsoft voices as they sound less robotic
      let bestVoice = matchingVoices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes('premium') || name.includes('natural') || name.includes('google') || name.includes('microsoft');
      });

      // If no high-quality voice is found, fallback to the local service or first matching voice
      if (!bestVoice) {
        bestVoice = matchingVoices.find(v => v.localService) || matchingVoices[0];
      }
      
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang; // Force the browser to use the exact locale of the specific voice picked
    }

    // Slightly reduce speech rate for better clarity and fluency
    utterance.rate = 0.9;
    utterance.onend = () => setSpeakLoading(false);
    utterance.onerror = (err) => {
      console.error("Speech error", err);
      setSpeakLoading(false); 
    }; 
    window.speechSynthesis.speak(utterance);
  };

  // ── Voice Input ───────────────────────────────────────────────────────────
  const toggleListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition })
        .SpeechRecognition ??
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser. Try Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      setInputText(e.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <span>←</span>
            <span className="text-sm font-medium">TRADUMUST</span>
          </Link>
          <h1 className="font-bold text-slate-900">Translation Studio</h1>
          <Link href="/phrasebook" className="text-sm text-blue-600 hover:underline font-medium">
            📚 Phrasebook
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0">
          {/* Tab Switch */}
          <div className="flex bg-white rounded-xl border border-slate-200 p-1 mb-6 w-fit">
            {(["text", "voice"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab === "text" ? "✍️ Text Translation" : "🎤 Voice Translation"}
              </button>
            ))}
          </div>

          {/* Language Selectors */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="flex-1 min-w-[140px] bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>

            <button
              onClick={() => {
                const s = sourceLang === "auto" ? "en" : sourceLang;
                setSourceLang(targetLang);
                setTargetLang(s);
              }}
              title="Swap languages"
              className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
            >
              ⇄
            </button>

            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="flex-1 min-w-[140px] bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TARGET_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Input Area */}
          <div className="bg-white rounded-xl border border-slate-200 mb-4 overflow-hidden">
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Type or paste text to translate..."
                className="w-full p-4 text-slate-800 resize-none focus:outline-none text-base leading-relaxed min-h-[140px]"
                rows={5}
              />
              {activeTab === "voice" && (
                <button
                  onClick={toggleListening}
                  className={`absolute top-3 right-3 p-2.5 rounded-full transition-all ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-200"
                      : "bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600"
                  }`}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  🎤
                </button>
              )}
            </div>
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-100">
              <span className={`text-xs ${inputText.length > MAX_CHARS * 0.9 ? "text-amber-600" : "text-slate-400"}`}>
                {inputText.length}/{MAX_CHARS}
              </span>
              {isListening && (
                <span className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                  Listening...
                </span>
              )}
              <button
                onClick={() => {
                  setInputText("");
                  setResult(null);
                  setCurrentEntry(null);
                  setSavedToPhrasebook(false);
                }}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear ✕
              </button>
            </div>
          </div>

          {/* Translate Button */}
          <button
            onClick={handleTranslate}
            disabled={loading || !inputText.trim()}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99] shadow-md shadow-blue-200 mb-6 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                🌐 Live Translation On
              </>
            )}
          </button>

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <span className="text-red-500 text-lg shrink-0">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">Translation failed</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-sm shrink-0">✕</button>
            </div>
          )}

          {/* Result Area */}
          {result && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Translation</span>
                <div className="flex gap-2">
                  <button
                    onClick={speakAloud}
                    disabled={speakLoading}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 transition-colors disabled:opacity-50"
                  >
                    {speakLoading ? "🔊..." : "🔊 Speak"}
                  </button>
                  <button
                    onClick={saveToPhrasebook}
                    disabled={savedToPhrasebook || savingPhrasebook}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      savedToPhrasebook
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600"
                    }`}
                  >
                    {savedToPhrasebook ? "✓ Saved!" : savingPhrasebook ? "Saving..." : "📚 Save to Phrasebook"}
                  </button>
                </div>
              </div>

              <p className="text-xl text-slate-900 font-medium leading-relaxed mb-2">
                {result.translated_text}
              </p>

              <CulturalNoteBox result={result} />
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="w-72 shrink-0 hidden lg:block">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-24">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span>🕐</span> Recent Translations
            </h3>
            {recentTranslations.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-3xl mb-2">📝</div>
                <p className="text-sm">Your recent translations will appear here.</p>
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
                      className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
                    >
                      <p className="text-sm text-slate-700 font-medium truncate">{item.source}</p>
                      <p className="text-xs text-slate-500 truncate">{item.result.translated_text}</p>
                      <span className="text-xs text-blue-500 mt-1 inline-block">→ {targetLabel}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100">
              <Link
                href="/phrasebook"
                className="block text-center text-sm text-blue-600 hover:underline font-medium"
              >
                View Phrasebook →
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
