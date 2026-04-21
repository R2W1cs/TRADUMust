"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Signer2D } from "@/components/Signer2D";
import { type WordMeta } from "@/components/VisualGlossBoard";
import { createTextToSign, savePhrasebookEntry, saveRecognizedSign, getPhrasebookEntries, type HistoryEntry } from "@/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, HandMetal, Eye, Webcam, VideoOff, Loader2, Info, BookOpen, AlertCircle, Camera, Globe, Sparkles, Bookmark, CheckCircle, X, Search, Filter, PlayCircle, History } from "lucide-react";
import { LogoCompact } from "@/components/Logo";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
type Mode = "understand" | "express";

interface SignTip {
  title: string;
  body: string;
  icon: string;
}

interface CommonPhrase {
  english: string;
  asl_note: string;
  fingerspelling?: string;
}

// ── Mock Data ──────────────────────────────────────────────────────────────
const SIGN_TIPS: SignTip[] = [
  {
    icon: "👁️",
    title: "Eye Contact is Grammar",
    body: "In ASL, maintaining eye contact with your conversation partner is not just politeness — it's part of the grammatical system. Breaking eye contact can signal you're not done signing.",
  },
  {
    icon: "🤜",
    title: "Signing Space",
    body: "Most ASL signs are produced in the 'signing space' — the area from your waist to the top of your head, and roughly arm's width to each side. Staying within this space keeps signs clear.",
  },
  {
    icon: "😮",
    title: "Facial Expressions are Words",
    body: "Raised eyebrows = yes/no question. Furrowed brows + forward lean = wh-question. These facial markers are not optional — they change the sentence type.",
  },
  {
    icon: "🌍",
    title: "ASL ≠ Universal",
    body: "There is no universal sign language. British Sign Language (BSL) and ASL are mutually unintelligible. France has LSF, Japan has JSL. This platform focuses on ASL.",
  },
];

const COMMON_PHRASES: CommonPhrase[] = [
  { english: "Where is the library?", asl_note: "Use LIBRARY + WHERE with furrowed brows and forward head tilt.", fingerspelling: "LIBRARY" },
  { english: "I don't understand.", asl_note: "Touch forehead with index finger, then shake hand outward — a very common and important phrase.", fingerspelling: "UNDERSTAND" },
  { english: "Can you repeat that?", asl_note: "Circle dominant hand palm-up, or simply sign AGAIN.", fingerspelling: "REPEAT" },
  { english: "My name is...", asl_note: "Sign MY + NAME + dominant-H taps non-dominant-H. Then fingerspell your name.", fingerspelling: "NAME" },
  { english: "Nice to meet you.", asl_note: "NICE + MEET + YOU. One of the most important social phrases.", fingerspelling: undefined },
];

const GESTURE_TRANSLATIONS: Record<string, { meaning: string; notes: string }> = {
  "Thumb Up":    { meaning: "Good / Approve",    notes: "In ASL, 'Good' is often signed from the chin down, but a thumbs up is a universal approval marker." },
  "Thumb Down":  { meaning: "Bad / Disapprove",  notes: "Universally understood as a negative response." },
  "Open Palm":   { meaning: "Stop / Wait / 5",   notes: "An open palm facing forward can mean wait or stop. It is also the number 5, or the base for 'Hello'." },
  "Closed Fist": { meaning: "Yes / Letter 'S'",  notes: "A closed fist with the thumb across it indicates the letter S or A, and nodding a fist means 'Yes'." },
  "Pointing Up": { meaning: "You / Look Up / Letter 'D'", notes: "A single index finger pointing up is the letter D, or pointing to someone/something." },
  "Victory":     { meaning: "Peace / Number 2 / Letter 'V'", notes: "The classic V sign translates directly to the letter V and the number 2 in ASL." },
  "ILoveYou":    { meaning: "I Love You",        notes: "A classic ASL sign combining the letters I, L, and Y into a single universal handshape." },
};

// ── Sub-components ─────────────────────────────────────────────────────────
function WebcamFeed({ active, onToggle, onRecognize }: { active: boolean; onToggle: () => void; onRecognize: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognizerRef = useRef<any>(null);
  const motionBufferRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    let animationFrameId: number;
    let lastVideoTime = -1;

    const start = async () => {
      if (active) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => videoRef.current?.play();
          }

          if (!recognizerRef.current) {
            const { GestureRecognizer, FilesetResolver } = await import("@mediapipe/tasks-vision");
            const vision = await FilesetResolver.forVisionTasks(
              "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
            );
            recognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
              baseOptions: { modelAssetPath: "/models/gesture_recognizer.task", delegate: "GPU" },
              runningMode: "VIDEO",
              numHands: 2,
            });
          }
          setModelReady(true);

          const { DrawingUtils, GestureRecognizer } = await import("@mediapipe/tasks-vision");

          const loop = async () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const recognizer = recognizerRef.current;

            if (video && canvas && recognizer && video.currentTime !== lastVideoTime && video.currentTime > 0) {
              lastVideoTime = video.currentTime;
              const results = recognizer.recognizeForVideo(video, performance.now());
              const ctx = canvas.getContext("2d");

              if (ctx) {
                canvas.width = video.clientWidth;
                canvas.height = video.clientHeight;
                ctx.save();
                ctx.scale(-1, 1);
                ctx.translate(-canvas.width, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (results.landmarks && results.landmarks.length > 0) {
                  const drawingUtils = new DrawingUtils(ctx);
                  const landmarks = results.landmarks[0];
                  const palm = landmarks[0];
                  const now = performance.now();
                  motionBufferRef.current.push({ x: palm.x, y: palm.y, time: now });
                  if (motionBufferRef.current.length > 40) motionBufferRef.current.shift();

                  const buffer = motionBufferRef.current;
                  if (buffer.length === 40) {
                    const dx = buffer[39].x - buffer[0].x;
                    const dy = buffer[39].y - buffer[0].y;
                    if (dy > 0.2 && Math.abs(dx) < 0.1) onRecognize("DYNAMIC_THANK_YOU");

                    const midX = buffer.reduce((a, b) => a + b.x, 0) / 40;
                    const midY = buffer.reduce((a, b) => a + b.y, 0) / 40;
                    const variances = buffer.map(p => Math.sqrt((p.x - midX) ** 2 + (p.y - midY) ** 2));
                    const avgRadius = variances.reduce((a, b) => a + b, 0) / 40;
                    const stdDev = Math.sqrt(variances.reduce((a, b) => a + (b - avgRadius) ** 2, 0) / 40);
                    if (avgRadius > 0.05 && stdDev < 0.02) onRecognize("DYNAMIC_PLEASE");
                  }

                  for (const lms of results.landmarks) {
                    const pixelLandmarks = lms.map((l: any) => ({ x: l.x * canvas.width, y: l.y * canvas.height, z: l.z || 0 }));
                    drawingUtils.drawConnectors(pixelLandmarks, GestureRecognizer.HAND_CONNECTIONS, { color: "rgba(168, 85, 247, 0.7)", lineWidth: 4 });
                    drawingUtils.drawLandmarks(pixelLandmarks, { color: "#fff", lineWidth: 2, radius: 4 });
                  }
                }
                ctx.restore();

                if (results.gestures && results.gestures.length > 0 && results.gestures[0].length > 0) {
                  const gesture = results.gestures[0][0];
                  if (gesture.categoryName !== "None") onRecognize(gesture.categoryName.replace("_", " "));
                }
              }
            }
            animationFrameId = requestAnimationFrame(loop);
          };
          loop();
        } catch (err) {
          console.error(err);
          alert("Camera access denied or model failed to load.");
          onToggle();
        }
      } else {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        setModelReady(false);
      }
    };
    start();
    return () => { cancelAnimationFrame(animationFrameId); streamRef.current?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-inner border border-white/10 group">
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${active ? "opacity-100" : "opacity-0"}`}
        style={{ transform: "scaleX(-1)" }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {!active && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <VideoOff className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-slate-400 font-medium text-sm tracking-wide uppercase">Camera Inactive</p>
        </div>
      )}

      {active && !modelReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/60 backdrop-blur-md">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
          <p className="text-white font-bold tracking-widest uppercase text-xs">Initializing ML Model</p>
        </div>
      )}

      <AnimatePresence>
        {active && modelReady && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 right-4 bg-slate-950/80 backdrop-blur-md rounded-xl px-4 py-3 flex items-center justify-between border border-white/10 shadow-xl z-20"
          >
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
              <span className="text-white text-xs font-bold tracking-widest uppercase">ML Recognition Active</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-10 pointer-events-none border-2 border-brand-primary/30 rounded-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-brand-primary/5 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-32 h-44 border-4 border-white/20 rounded-[3rem] relative"
            >
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/40 uppercase tracking-widest whitespace-nowrap">AR Guidance Active</div>
            </motion.div>
          </div>
        </motion.div>
      )}

      <button
        onClick={onToggle}
        className={cn(
          "absolute top-4 right-4 p-3.5 rounded-full shadow-xl transition-all z-10 border",
          active
            ? "bg-red-500/20 hover:bg-red-500/40 border-red-500/50 text-red-300"
            : "bg-purple-600 hover:bg-purple-500 border-purple-400/50 text-white"
        )}
      >
        {active ? <VideoOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
      </button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function SignPage() {
  const [mode, setMode] = useState<Mode>("understand");
  const [cameraActive, setCameraActive] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [recognizing, setRecognizing] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [expressInput, setExpressInput] = useState("Hello");
  const [avatarAnimating, setAvatarAnimating] = useState(false);
  const [glossData, setGlossData] = useState<{ sentiment?: any; metadata?: WordMeta[] }>({});
  const [currentSign, setCurrentSign] = useState<{ word: string; tag: string } | null>(null);
  const [signApiError, setSignApiError] = useState<string | null>(null);
  const signTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const smoothingBufferRef = useRef<Record<string, number>>({});
  const SMOOTHING_THRESHOLD = 8;

  const [sentenceBuffer, setSentenceBuffer] = useState<string[]>([]);
  const lastAddedSignRef = useRef<string | null>(null);
  const signHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastHistoryId, setLastHistoryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedToPhrasebook, setSavedToPhrasebook] = useState(false);
  const [selectedSignLang, setSelectedSignLang] = useState("ASL");
  const [recognitionSaving, setRecognitionSaving] = useState(false);
  const [recognitionSaved, setRecognitionSaved] = useState(false);

  // Library Modal State
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryPhrases, setLibraryPhrases] = useState<HistoryEntry[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategory, setLibraryCategory] = useState("all");

  // Load persistence
  useEffect(() => {
    const saved = localStorage.getItem("tradumust_preferred_sign_lang");
    if (saved) setSelectedSignLang(saved);
  }, []);

  // Save persistence
  const handleLangChange = (lang: string) => {
    setSelectedSignLang(lang);
    localStorage.setItem("tradumust_preferred_sign_lang", lang);
  };

  useEffect(() => {
    const interval = setInterval(() => { setTipIndex((i) => (i + 1) % SIGN_TIPS.length); }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!cameraActive) { setRecognizedText(""); setSentenceBuffer([]); setRecognitionSaved(false); }
  }, [cameraActive]);

  const handleRecognize = useCallback((rawLabel: string) => {
    const buffer = smoothingBufferRef.current;
    Object.keys(buffer).forEach(k => { if (k !== rawLabel) buffer[k] = Math.max(0, buffer[k] - 1); });
    buffer[rawLabel] = (buffer[rawLabel] || 0) + 1;
    if (buffer[rawLabel] < SMOOTHING_THRESHOLD) return;

    setRecognizedText(rawLabel);
    setRecognizing(false);

    const SHORT_TERMS: Record<string, string> = {
      "Thumb Up": "Good", "Thumb Down": "Bad", "Open Palm": "Wait", "Closed Fist": "Yes",
      "Pointing Up": "You", "Victory": "Peace", "ILoveYou": "Love",
      "DYNAMIC_THANK_YOU": "Thank You", "DYNAMIC_PLEASE": "Please",
    };
    const word = SHORT_TERMS[rawLabel];
    if (!word) return;

    if (lastAddedSignRef.current !== rawLabel) {
      if (signHoldTimerRef.current) clearTimeout(signHoldTimerRef.current);
      signHoldTimerRef.current = setTimeout(() => {
        setSentenceBuffer(prev => [...prev, word]);
        lastAddedSignRef.current = rawLabel;
      }, 500);
    }
  }, []);

  const animateAvatar = useCallback(async (overrideText?: string) => {
    const textToSign = (typeof overrideText === "string" ? overrideText : expressInput).trim();
    if (!textToSign) return;

    if (typeof overrideText === "string") {
      setExpressInput(textToSign);
      setMode("express");
    }

    setAvatarAnimating(true);
    setSignApiError(null);
    setLastHistoryId(null);
    setSavedToPhrasebook(false);
    try {
      const data = await createTextToSign({ text: textToSign, sign_language: selectedSignLang });
      const durationMap: Record<string, number> = {};
      if (Array.isArray(data.animation_clips)) {
        for (const clip of data.animation_clips) durationMap[clip.word?.toUpperCase()] = clip.duration_ms;
      }
      const mergedMeta: WordMeta[] = (data.syntactic_metadata ?? []).map((m: any) => ({ ...m, duration_ms: durationMap[m.word?.toUpperCase()] }));
      setGlossData({ sentiment: data.sentiment, metadata: mergedMeta });
      const totalDuration = mergedMeta.reduce((acc, m) => acc + (m.duration_ms ?? 1100), 0);
      if (data.history_entry?.id) setLastHistoryId(data.history_entry.id);
      setTimeout(() => setAvatarAnimating(false), totalDuration + 1000);
    } catch (err) {
      setSignApiError(err instanceof Error ? err.message : "Signing service unavailable.");
      setAvatarAnimating(false);
    }
  }, [expressInput, selectedSignLang]);

  const handleSaveToPhrasebook = useCallback(async () => {
    if (!lastHistoryId) return;
    setIsSaving(true);
    try {
      await savePhrasebookEntry(lastHistoryId);
      setSavedToPhrasebook(true);
      setLastHistoryId(null);
    } catch {
      // silently ignore duplicate saves
    } finally {
      setIsSaving(false);
    }
  }, [lastHistoryId]);

  const handleSaveRecognition = useCallback(async () => {
    if (sentenceBuffer.length === 0) return;
    setRecognitionSaving(true);
    try {
      const { history_entry } = await saveRecognizedSign({
        text: sentenceBuffer.join(" "),
        sign_language: selectedSignLang,
      });
      await savePhrasebookEntry(history_entry.id);
      setRecognitionSaved(true);
    } catch (err) {
      console.error("Failed to save recognition:", err);
    } finally {
      setRecognitionSaving(false);
    }
  }, [sentenceBuffer, selectedSignLang]);

  useEffect(() => {
    signTimers.current.forEach(clearTimeout);
    signTimers.current = [];
    setCurrentSign(null);
    if (!avatarAnimating || !glossData.metadata?.length) return;
    const entries = glossData.metadata;
    const TAG_DUR: Record<string, number> = { TIME: 900, SUBJECT: 1000, OBJECT: 1000, ACTION: 1300, MODIFIER: 800 };
    function drive(i: number) {
      if (i >= entries.length) { setCurrentSign(null); return; }
      const e = entries[i];
      setCurrentSign({ word: e.word, tag: e.tag });
      const t = setTimeout(() => drive(i + 1), (e.duration_ms ?? TAG_DUR[e.tag] ?? 1100) + 120);
      signTimers.current.push(t);
    }
    drive(0);
    return () => { signTimers.current.forEach(clearTimeout); };
  }, [avatarAnimating, glossData.metadata]);

  const currentTip = SIGN_TIPS[tipIndex];

  const fetchLibraryPhrases = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const data = await getPhrasebookEntries(600);
      setLibraryPhrases(data);
    } catch (err) {
      console.error("Failed to load phrase library:", err);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLibraryOpen && libraryPhrases.length === 0) {
      fetchLibraryPhrases();
    }
  }, [isLibraryOpen, libraryPhrases.length, fetchLibraryPhrases]);

  return (
    <div className="page-shell font-sans relative">
      {/* Decorative blobs */}
      <div className="fixed top-[20%] left-[-20%] w-[60%] h-[60%] bg-purple-400/8 dark:bg-purple-900/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-400/6 dark:bg-blue-900/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="glass-panel px-6 py-4 sticky top-0 z-40 border-b border-[var(--panel-border)] rounded-b-none shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <LogoCompact />
          </Link>
          <h1 className="font-bold text-lg hidden sm:block text-[var(--foreground)]">Sign Language Bridge</h1>
          <Link href="/translate" className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors bg-blue-500/10 px-4 py-2 rounded-full border border-blue-400/20 dark:border-blue-500/20 hover:border-blue-400/40 group">
            <Globe className="w-4 h-4" />
            <span>Translate</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col lg:flex-row gap-8 relative z-10 w-full overflow-hidden">
        {/* ── Main Panel ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Mode Toggle */}
          <div className="flex p-1 tab-bar rounded-2xl w-fit shadow-sm">
            <button
              onClick={() => setMode("understand")}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-semibold transition-all relative flex items-center gap-2",
                mode === "understand" ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {mode === "understand" && <motion.div layoutId="sign-tab" className="absolute inset-0 bg-purple-600 rounded-xl" style={{ zIndex: -1 }} />}
              <Eye className="w-4 h-4" /> Understand
            </button>
            <button
              onClick={() => setMode("express")}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-semibold transition-all relative flex items-center gap-2",
                mode === "express" ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {mode === "express" && <motion.div layoutId="sign-tab" className="absolute inset-0 bg-purple-600 rounded-xl" style={{ zIndex: -1 }} />}
              <HandMetal className="w-4 h-4" /> Express
            </button>
          </div>

          {/* Sign Language Selector */}
          <div className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--panel-border)] p-2 rounded-2xl w-fit">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] ml-3">Language:</span>
            <div className="flex gap-1">
              {["ASL", "LSF", "BSL"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLangChange(lang)}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-xs font-bold transition-all border",
                    selectedSignLang === lang
                      ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/20"
                      : "bg-[var(--surface-deep)] border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  )}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ── Mode A: Understand Sign ── */}
            {mode === "understand" && (
              <motion.div key="understand" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="glass-panel p-6 rounded-3xl relative">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <h2 className="font-bold text-[var(--foreground)] text-lg flex items-center gap-2">
                      <Webcam className="w-5 h-5 text-purple-500" /> AI Sign Recognition
                    </h2>
                    {cameraActive ? (
                      <span className="flex items-center gap-2 text-xs font-bold tracking-widest text-green-700 dark:text-green-400 bg-green-500/10 px-4 py-1.5 rounded-full border border-green-400/20 dark:border-green-500/20 uppercase">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" /> Active
                      </span>
                    ) : (
                      <span className="text-xs font-bold tracking-widest text-[var(--text-muted)] bg-[var(--surface)] px-4 py-1.5 rounded-full uppercase border border-[var(--panel-border)]">Offline</span>
                    )}
                  </div>
                  <WebcamFeed active={cameraActive} onToggle={() => setCameraActive((v) => !v)} onRecognize={handleRecognize} />
                </div>

                <div className="glass-panel p-6 rounded-3xl">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="font-bold text-[var(--foreground)]">Recognized Sentence</h3>
                    {recognizing && <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />}
                  </div>

                  <div className="min-h-[140px] bg-[var(--surface-deep)] rounded-2xl border border-[var(--panel-border)] p-6 flex flex-col justify-center relative overflow-hidden shadow-inner">
                    {sentenceBuffer.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mb-4 bg-purple-500/10 border border-purple-400/20 dark:border-purple-500/20 p-5 rounded-2xl">
                        <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Info className="w-3 h-3" /> Aggregated Meaning
                        </p>
                        <p className="text-3xl font-medium text-[var(--foreground)]">{sentenceBuffer.join(" ")}</p>
                        <button
                          onClick={() => { setSentenceBuffer([]); setRecognitionSaved(false); }}
                          className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-red-500 mt-4 bg-[var(--panel-bg)] px-3 py-1.5 rounded-full border border-[var(--panel-border)] transition-colors"
                        >
                          Clear Sentence
                        </button>
                      </motion.div>
                    )}

                    {sentenceBuffer.length > 0 && (
                      <div className="flex justify-end mt-2">
                        {recognitionSaved ? (
                          <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold ml-auto bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-400/20 uppercase tracking-widest text-[10px]">
                            <CheckCircle className="w-4 h-4" /> Saved to Phrasebook
                          </span>
                        ) : (
                          <button
                            onClick={handleSaveRecognition}
                            disabled={recognitionSaving}
                            className="flex items-center gap-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-400 font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl border border-purple-400/20 transition-all ml-auto"
                          >
                            {recognitionSaving ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
                            ) : (
                              <><Bookmark className="w-3 h-3" /> Save recognized phrase</>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {recognizedText ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10">
                        <div className="flex items-baseline gap-3 mb-2">
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-300">
                            {GESTURE_TRANSLATIONS[recognizedText]?.meaning || recognizedText}
                          </p>
                          <span className="text-[10px] uppercase tracking-widest font-bold font-mono bg-[var(--tag-bg)] text-[var(--tag-text)] px-2 py-1 rounded border border-[var(--tag-border)]">
                            Raw: {recognizedText}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                          {GESTURE_TRANSLATIONS[recognizedText]?.notes || "Raw ML output specific mapping unavailable."}
                        </p>
                      </motion.div>
                    ) : (
                      <p className="text-[var(--text-muted)] text-sm text-center relative z-10 font-medium">
                        {cameraActive ? "Analyzing landmarks… Hold up a sign." : "Enable your camera to start recognition."}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Mode B: Express Sign ── */}
            {mode === "express" && (
              <motion.div key="express" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                <div className="glass-panel p-6 rounded-3xl">
                  <h2 className="font-bold text-[var(--foreground)] mb-6 text-lg flex items-center gap-2">
                    <HandMetal className="w-5 h-5 text-purple-500" /> Text to 3D Avatar
                  </h2>

                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <input
                      type="text"
                      value={expressInput}
                      onChange={(e) => setExpressInput(e.target.value)}
                      placeholder="Type what you want to sign..."
                      className="flex-1 bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-5 py-3 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 placeholder:text-[var(--text-muted)] transition-colors"
                    />
                    <button
                      onClick={animateAvatar}
                      disabled={avatarAnimating || !expressInput.trim()}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(147,51,234,0.25)] whitespace-nowrap"
                    >
                      {avatarAnimating
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating</>
                        : <><Sparkles className="w-4 h-4" /> Animate Avatar</>
                      }
                    </button>
                  </div>

                  {/* Avatar canvas — intentionally keeps dark for video/3D contrast */}
                  <div className="flex flex-col items-center justify-center bg-slate-950/90 dark:bg-slate-950/80 border border-white/5 rounded-3xl py-12 relative overflow-hidden shadow-inner min-h-[400px]">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -mr-20 -mt-20" />

                    <div className="relative z-10 p-6 bg-gradient-to-br from-slate-900/50 to-slate-950/80 border border-white/5 rounded-3xl backdrop-blur-xl shadow-2xl">
                      <Signer2D word={currentSign?.word ?? ""} tag={currentSign?.tag} className="w-80 h-96" />
                    </div>

                    <div className="h-10 mt-6 flex items-center relative z-10">
                      <p className={cn("text-2xl font-black tracking-[0.2em] uppercase transition-opacity duration-300 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400", currentSign ? "opacity-100" : "opacity-0")}>
                        {currentSign?.word ?? "..."}
                      </p>
                    </div>
                  </div>

                  <AnimatePresence>
                    {(lastHistoryId || savedToPhrasebook) && !avatarAnimating && (
                      <motion.div
                        key="save-bar"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="mt-4 flex items-center justify-between bg-[var(--surface)] border border-[var(--panel-border)] rounded-2xl px-5 py-3"
                      >
                        <p className="text-sm text-[var(--text-secondary)]">
                          Sign generated — add it to your phrasebook?
                        </p>
                        {savedToPhrasebook ? (
                          <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                            <CheckCircle className="w-4 h-4" /> Saved
                          </span>
                        ) : (
                          <button
                            onClick={handleSaveToPhrasebook}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-xl transition-all"
                          >
                            {isSaving
                              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                              : <><Bookmark className="w-4 h-4" /> Save to Phrasebook</>
                            }
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {signApiError && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4">
                      <div className="error-alert flex items-start gap-3 rounded-2xl px-5 py-4">
                        <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-[var(--error-title)]">Request failed</p>
                          <p className="text-sm text-[var(--error-body)]">{signApiError}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right Sidebar ── */}
        <aside className="w-80 shrink-0 hidden lg:flex flex-col gap-6">
          {/* Daily Tip — intentionally styled with purple accent */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 rounded-3xl relative overflow-hidden border border-purple-400/15 dark:border-purple-500/20"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-4 flex items-center gap-2">
              <BookOpen className="w-3 h-3" /> Daily Context
            </p>
            <div className="text-3xl mb-3 drop-shadow-lg">{currentTip.icon}</div>
            <h3 className="font-bold text-[var(--foreground)] text-lg mb-3 relative z-10">{currentTip.title}</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed relative z-10">{currentTip.body}</p>
            <div className="flex gap-2 mt-6 relative z-10">
              {SIGN_TIPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTipIndex(i)}
                  className={cn("h-1.5 rounded-full transition-all duration-300", i === tipIndex ? "w-8 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" : "w-2 bg-[var(--panel-border)] hover:bg-[var(--text-muted)]")}
                />
              ))}
            </div>
          </motion.div>

          {/* Common Phrases */}
          <div className="glass-panel p-6 rounded-3xl">
            <h3 className="font-bold text-[var(--foreground)] mb-5 text-sm uppercase tracking-widest">Common Phrases</h3>
            <div className="space-y-3">
              {COMMON_PHRASES.slice(0, 4).map((phrase, i) => (
                <div key={i} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--panel-border)] hover:border-purple-400/25 dark:hover:border-purple-500/30 transition-all group">
                  <p className="text-sm font-bold text-[var(--foreground)] mb-1">{phrase.english}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-3">{phrase.asl_note}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => animateAvatar(phrase.english)}
                      className="text-[9px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-1.5 rounded flex items-center gap-1.5 hover:bg-purple-500/20 transition-colors"
                    >
                      <PlayCircle className="w-3 h-3" /> Play
                    </button>
                    {phrase.fingerspelling && (
                      <button
                        onClick={() => animateAvatar(phrase.fingerspelling)}
                        className="text-[9px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1.5 rounded flex items-center gap-1.5 hover:bg-blue-500/20 transition-colors"
                      >
                        <HandMetal className="w-3 h-3" /> Fingerspell
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={() => setIsLibraryOpen(true)}
                className="w-full py-3 rounded-2xl border border-dashed border-[var(--panel-border)] text-[var(--text-muted)] hover:text-purple-500 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2"
              >
                <Search className="w-3 h-3" /> See More (500+)
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Phrase Library Modal ── */}
      <AnimatePresence>
        {isLibraryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLibraryOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative z-10 glass-panel w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl border-white/10"
            >
              {/* Modal Header */}
              <div className="px-8 pt-8 pb-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-purple-500" /> Phrase Library
                    <span className="text-xs font-bold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/30 ml-2">500+ Items</span>
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Browse common expressions and academic terms</p>
                </div>
                <button 
                  onClick={() => setIsLibraryOpen(false)}
                  className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors self-start sm:self-center"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Filters Box */}
              <div className="bg-white/5 px-8 py-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search phrases..."
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
                  <Filter className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  {["all", "ACADEMIC", "DAILY", "SIGN", "CAMPUS", "HEALTH", "SHOPPING"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setLibraryCategory(cat)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border",
                        libraryCategory === cat
                          ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/20"
                          : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {libraryLoading ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Loading seeded library...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {libraryPhrases
                      .filter(p => {
                        const matchesSearch = p.source.toLowerCase().includes(librarySearch.toLowerCase());
                        const category = (p.extra as any).category || "DAILY";
                        const matchesCategory = libraryCategory === "all" || category === libraryCategory;
                        return matchesSearch && matchesCategory;
                      })
                      .map((phrase) => (
                        <div key={phrase.id} className="group p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.08] hover:border-purple-500/30 transition-all flex flex-col justify-between text-left">
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-400">
                                {(phrase.extra as any).category || "DAILY"}
                              </span>
                              <div className="flex items-center gap-1">
                                <History className="w-3 h-3 text-slate-600" />
                                <span className="text-[9px] text-slate-500 font-bold uppercase">{phrase.targetLang}</span>
                              </div>
                            </div>
                            <p className="text-white font-bold text-base group-hover:text-purple-200 transition-colors">{phrase.source}</p>
                            <p className="text-slate-400 text-xs mt-1 italic leading-relaxed">"{phrase.result.cultural_note}"</p>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => { animateAvatar(phrase.source); setIsLibraryOpen(false); }}
                              className="flex-1 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/30 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                              <PlayCircle className="w-4 h-4" /> Play
                            </button>
                            <button
                              onClick={async (e) => {
                                const btn = e.currentTarget;
                                btn.disabled = true;
                                try {
                                  await savePhrasebookEntry(phrase.id);
                                  const iconContainer = btn.querySelector('.save-icon');
                                  if (iconContainer) iconContainer.innerHTML = 'Saved';
                                  setTimeout(() => { if (iconContainer) iconContainer.innerHTML = ''; btn.disabled = false; }, 2000);
                                } catch { 
                                  btn.disabled = false;
                                }
                              }}
                              className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
                              title="Save to Phrasebook"
                            >
                              <Bookmark className="w-4 h-4" />
                              <span className="save-icon text-[9px] font-bold uppercase"></span>
                            </button>
                          </div>
                        </div>
                      ))}
                    {libraryPhrases.length > 0 && libraryPhrases.some(p => p.source.toLowerCase().includes(librarySearch.toLowerCase())) === false && (
                      <div className="col-span-full py-20 text-center">
                        <Search className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">No phrases found matching "{librarySearch}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-6 bg-slate-900/50 border-t border-white/5 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">TraduMust Accessibility Library &copy; 2024</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
