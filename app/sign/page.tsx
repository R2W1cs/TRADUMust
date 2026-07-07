"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { recognizeApi } from "@/lib/tradumust-api";
import { AslAvatar3D, type AslAvatar3DHandle } from "@/components/AslAvatar3D";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { classifyLandmarks, applyAslGrammar } from "@/lib/landmark-classifier";
import { motion, AnimatePresence } from "framer-motion";
import {
  HandMetal, Eye, Camera, VideoOff, Loader2, Info, BookOpen,
  AlertCircle, Sparkles, Bookmark, CheckCircle, PlayCircle,
} from "lucide-react";
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
  "DYNAMIC_THANK_YOU": { meaning: "Thank You", notes: "Downward palm sweep from chin — like blowing a grateful kiss." },
  "DYNAMIC_PLEASE":    { meaning: "Please",    notes: "Circular palm on chest — PLEASE and THANK YOU share the same base motion." },
  "HELLO":             { meaning: "Hello",              notes: "Flat hand waves outward from the forehead — a relaxed salute." },
  "THANK_YOU":         { meaning: "Thank You",          notes: "Flat hand moves forward and down from the chin." },
  "PLEASE":            { meaning: "Please",             notes: "Flat hand circles on the chest." },
  "SORRY":             { meaning: "Sorry",              notes: "Closed fist circles on the chest." },
  "GOODBYE":           { meaning: "Goodbye",            notes: "Open hand waves side to side." },
  "YES":               { meaning: "Yes",                notes: "Fist nods up and down, mimicking a nodding head." },
  "NO":                { meaning: "No",                 notes: "Index and middle snap together with a shake." },
  "OK":                { meaning: "OK / Fine",          notes: "Index and thumb form a circle." },
  "HAPPY":             { meaning: "Happy",              notes: "Flat hand brushes upward from the chest." },
  "SAD":               { meaning: "Sad",                notes: "Flat hands slide down the face like tears falling." },
  "TIRED":             { meaning: "Tired",              notes: "Both hands drop from the chest." },
  "UNDERSTAND":        { meaning: "Understand",         notes: "Index flicks upward at the temple." },
  "DONT_UNDERSTAND":   { meaning: "Don't Understand",   notes: "Index shakes at the temple." },
  "THINK":             { meaning: "Think",              notes: "Index circles at the temple." },
  "KNOW":              { meaning: "Know",               notes: "Flat fingertips tap the temple." },
  "FORGET":            { meaning: "Forget",             notes: "Flat hand wipes across the forehead then flicks away." },
  "STOP":              { meaning: "Stop",               notes: "Flat hand chops sharply downward." },
  "HELP":              { meaning: "Help",               notes: "Thumb-up fist lifts upward." },
  "FINISH":            { meaning: "Finish / Done",      notes: "Open hands flip outward." },
  "START":             { meaning: "Start / Begin",      notes: "Index twists into the non-dominant palm." },
  "GIVE":              { meaning: "Give",               notes: "Flat hand extends forward from the chest." },
  "ME":                { meaning: "Me / I",             notes: "Index points to yourself." },
  "YOU":               { meaning: "You",                notes: "Index points at the other person." },
  "SEE":               { meaning: "See / Look",         notes: "V-shape at the eyes." },
  "SAY":               { meaning: "Say / Tell",         notes: "Index at the mouth moves forward." },
  "HEARING":           { meaning: "Hearing (person)",   notes: "Index circles at the mouth." },
  "SPEAK":             { meaning: "Speak / Voice",      notes: "Index moves upward from the mouth." },
  "PEACE":             { meaning: "Peace / 2 / Victory",notes: "V-shape at neutral level." },
  "CHOOSE":            { meaning: "Choose / Select",    notes: "V-hand pinches downward." },
  "QUESTION":          { meaning: "Question",           notes: "Index traces a question mark in the air." },
  "WRITE":             { meaning: "Write",              notes: "A-hand scribbles across the non-dominant palm." },
  "LEARN":             { meaning: "Learn",              notes: "Claw hand lifts knowledge from palm to the forehead." },
  "TOMORROW":          { meaning: "Tomorrow",           notes: "Thumb at the cheek pointing forward." },
  "I_LOVE_YOU":        { meaning: "I Love You ❤️",      notes: "I+L+Y combined into one handshape." },
  "PHONE":             { meaning: "Phone / Call",       notes: "Thumb and pinky form a handset at the ear." },
  "PLAY":              { meaning: "Play / Fun",         notes: "Y-hands shake loosely." },
  "ROCK":              { meaning: "Rock On / Horns",    notes: "Index and pinky extended." },
  "THREE_FINGERS":     { meaning: "Wait / Pause",       notes: "Three fingers held still." },
  "THUMB_UP":          { meaning: "Good / Approve",     notes: "Thumbs up — universal approval gesture." },
  "ONE":               { meaning: "1",                  notes: "Index finger raised." },
  "THREE":             { meaning: "3",                  notes: "Index, middle, and ring fingers raised." },
  "FOUR":              { meaning: "4",                  notes: "Four fingers extended with thumb tucked." },
  "FIVE":              { meaning: "5 / Open Hand",      notes: "All five fingers spread wide." },
  "TEN":               { meaning: "10",                 notes: "Thumb shakes." },
  "TWO_CIRCLE":        { meaning: "2 / Again / Repeat", notes: "V-hand circles." },
  "FIST":              { meaning: "Fist / Letter S",    notes: "Closed fist." },
};

// ── WebcamFeed ─────────────────────────────────────────────────────────────
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
            const opts = {
              baseOptions: { modelAssetPath: "/models/gesture_recognizer.task", delegate: "GPU" as const },
              runningMode: "VIDEO" as const,
              numHands: 2,
            };
            try {
              recognizerRef.current = await GestureRecognizer.createFromOptions(vision, opts);
            } catch {
              recognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
                ...opts,
                baseOptions: { ...opts.baseOptions, delegate: "CPU" },
              });
            }
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

                let usedClassifier = false;
                if (results.landmarks && results.landmarks.length > 0) {
                  const drawingUtils = new DrawingUtils(ctx);
                  const landmarks = results.landmarks[0];
                  const palm = landmarks[0];
                  const now = performance.now();
                  motionBufferRef.current.push({ x: palm.x, y: palm.y, time: now });
                  if (motionBufferRef.current.length > 40) motionBufferRef.current.shift();

                  const classified = classifyLandmarks(landmarks, motionBufferRef.current, results.landmarks[1]);
                  if (classified) { onRecognize(classified.key); usedClassifier = true; }

                  for (const lms of results.landmarks) {
                    const pixelLandmarks = lms.map((l: any) => ({ x: l.x * canvas.width, y: l.y * canvas.height, z: l.z || 0 }));
                    drawingUtils.drawConnectors(pixelLandmarks, GestureRecognizer.HAND_CONNECTIONS, { color: "rgba(168, 85, 247, 0.7)", lineWidth: 4 });
                    drawingUtils.drawLandmarks(pixelLandmarks, { color: "#fff", lineWidth: 2, radius: 4 });
                  }
                }
                ctx.restore();

                if (!usedClassifier && results.gestures && results.gestures.length > 0 && results.gestures[0].length > 0) {
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
          <Loader2 className="w-10 h-10 text-[var(--brand-primary)] animate-spin" />
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
            : "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] border-[var(--brand-primary)]/50 text-white"
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
  const [expressInput, setExpressInput] = useState("مرحبا");
  const avatarRef = useRef<AslAvatar3DHandle>(null);
  const [signApiError, setSignApiError] = useState<string | null>(null);
  const smoothingBufferRef = useRef<Record<string, number>>({});
  const SMOOTHING_THRESHOLD = 5;

  const [sentenceBuffer, setSentenceBuffer] = useState<string[]>([]);
  const lastAddedSignRef = useRef<string | null>(null);
  const signHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recognitionSaved, setRecognitionSaved] = useState(false);
  const [selectedSignLang, setSelectedSignLang] = useState("ASL");

  useEffect(() => {
    const saved = localStorage.getItem("signbridge_preferred_sign_lang");
    if (saved) setSelectedSignLang(saved);
  }, []);

  const handleLangChange = (lang: string) => {
    setSelectedSignLang(lang);
    localStorage.setItem("signbridge_preferred_sign_lang", lang);
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
      "Thumb Up": "Good", "Thumb Down": "Bad", "Open Palm": "Wait",
      "Closed Fist": "Yes", "Pointing Up": "You", "Victory": "Peace", "ILoveYou": "Love",
      "DYNAMIC_THANK_YOU": "Thank You", "DYNAMIC_PLEASE": "Please",
      "HELLO": "Hello", "THANK_YOU": "Thank You", "PLEASE": "Please",
      "SORRY": "Sorry", "GOODBYE": "Goodbye", "YES": "Yes", "NO": "No", "OK": "OK",
      "HAPPY": "Happy", "SAD": "Sad", "TIRED": "Tired",
      "UNDERSTAND": "Understand", "DONT_UNDERSTAND": "Don't Understand",
      "THINK": "Think", "KNOW": "Know", "FORGET": "Forget",
      "STOP": "Stop", "HELP": "Help", "FINISH": "Done", "START": "Start", "GIVE": "Give",
      "ME": "Me", "YOU": "You", "SEE": "See", "SAY": "Say",
      "HEARING": "Hearing", "SPEAK": "Speak",
      "PEACE": "Peace", "CHOOSE": "Choose", "QUESTION": "Question",
      "WRITE": "Write", "LEARN": "Learn", "TOMORROW": "Tomorrow",
      "I_LOVE_YOU": "I Love You", "PHONE": "Phone", "PLAY": "Play",
      "ROCK": "Rock On", "THREE_FINGERS": "Wait", "THUMB_UP": "Good",
      "ONE": "1", "THREE": "3", "FOUR": "4", "FIVE": "5",
      "TEN": "10", "TWO_CIRCLE": "Again", "FIST": "Yes",
    };
    const word = SHORT_TERMS[rawLabel];
    if (!word) return;

    if (lastAddedSignRef.current !== rawLabel) {
      if (signHoldTimerRef.current) clearTimeout(signHoldTimerRef.current);
      signHoldTimerRef.current = setTimeout(() => {
        setSentenceBuffer(prev => [...prev, word]);
        lastAddedSignRef.current = rawLabel;
      }, 350);
    }
  }, []);

  const animateAvatar = useCallback((overrideText?: string) => {
    const textToSign = (typeof overrideText === "string" ? overrideText : expressInput).trim();
    if (!textToSign) return;

    if (typeof overrideText === "string") {
      setExpressInput(textToSign);
      setMode("express");
    }

    setSignApiError(null);
    avatarRef.current?.play(textToSign);
  }, [expressInput]);

  const handleSaveRecognition = useCallback(async () => {
    if (sentenceBuffer.length === 0) return;
    setIsSaving(true);
    try {
      await recognizeApi.save({
        text: sentenceBuffer.join(" "),
        signLanguage: selectedSignLang as "ASL" | "BSL" | "LSF",
      });
      setRecognitionSaved(true);
    } catch (err) {
      console.error("Failed to save recognition:", err);
    } finally {
      setIsSaving(false);
    }
  }, [sentenceBuffer, selectedSignLang]);

  const currentTip = SIGN_TIPS[tipIndex];

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Sign studio</h1>
          <p className="text-sm text-[var(--text-secondary)]">Text ↔ sign translation and AI recognition</p>
        </div>

      <div className="flex flex-col lg:flex-row gap-8 w-full">
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
              {mode === "understand" && <motion.div layoutId="sign-tab" className="absolute inset-0 bg-[var(--brand-primary)] rounded-xl" style={{ zIndex: -1 }} />}
              <Eye className="w-4 h-4" /> Understand
            </button>
            <button
              onClick={() => setMode("express")}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-semibold transition-all relative flex items-center gap-2",
                mode === "express" ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {mode === "express" && <motion.div layoutId="sign-tab" className="absolute inset-0 bg-[var(--brand-primary)] rounded-xl" style={{ zIndex: -1 }} />}
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
                      ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-sm"
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
                <div className="surface-card p-6 rounded-[var(--radius-lg)] relative">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <h2 className="font-bold text-[var(--foreground)] text-lg flex items-center gap-2">
                      <Camera className="w-5 h-5 text-[var(--brand-primary)]" /> AI Sign Recognition
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

                <div className="surface-card p-6 rounded-[var(--radius-lg)]">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="font-bold text-[var(--foreground)]">Recognized Sentence</h3>
                    {recognizing && <Loader2 className="w-4 h-4 text-[var(--brand-primary)] animate-spin" />}
                  </div>

                  <div className="min-h-[140px] bg-[var(--surface-deep)] rounded-2xl border border-[var(--panel-border)] p-6 flex flex-col justify-center relative overflow-hidden shadow-inner">
                    {sentenceBuffer.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mb-4 bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 dark:border-[var(--brand-primary)]/20 p-5 rounded-2xl">
                        <p className="text-[10px] font-bold text-[var(--brand-primary)] dark:text-[var(--brand-primary)] uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Info className="w-3 h-3" /> Aggregated Meaning
                        </p>
                        <p className="text-3xl font-medium text-[var(--foreground)]">{applyAslGrammar(sentenceBuffer).join(" ")}</p>
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
                            <CheckCircle className="w-4 h-4" /> Saved
                          </span>
                        ) : (
                          <button
                            onClick={handleSaveRecognition}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] dark:text-[var(--brand-primary)] font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl border border-[var(--brand-primary)]/20 transition-all ml-auto"
                          >
                            {isSaving ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
                            ) : (
                              <><Bookmark className="w-3 h-3" /> Save recognized sign</>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {recognizedText ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10">
                        <div className="flex items-baseline gap-3 mb-2">
                          <p className="text-2xl font-bold text-[var(--brand-primary)] dark:text-[var(--brand-primary)]">
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
                <div className="surface-card p-6 rounded-[var(--radius-lg)]">
                  <h2 className="font-bold text-[var(--foreground)] mb-2 text-lg flex items-center gap-2">
                    <HandMetal className="w-5 h-5 text-[var(--brand-primary)]" /> Text to 3D Avatar
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] mb-6">
                    CWASA 3D signing avatar — same engine as{" "}
                    <a href="https://3dasl-avatar.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                      3D ASL Translator
                    </a>
                    . Use gloss words from the library or open{" "}
                    <a href="/express" className="text-indigo-500 hover:underline">Express</a> for the full experience.
                  </p>

                  <AslAvatar3D
                    ref={avatarRef}
                    defaultText={expressInput}
                    showControls
                    minHeight={440}
                  />

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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface-card p-6 rounded-[var(--radius-lg)] relative overflow-hidden border border-[var(--brand-primary)]/15 dark:border-[var(--brand-primary)]/20"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-primary)]/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand-primary)] dark:text-[var(--brand-primary)] mb-4 flex items-center gap-2">
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
                  className={cn("h-1.5 rounded-full transition-all duration-300", i === tipIndex ? "w-8 bg-[var(--brand-primary)]" : "w-2 bg-[var(--panel-border)] hover:bg-[var(--text-muted)]")}
                />
              ))}
            </div>
          </motion.div>

          {/* Common Phrases */}
          <div className="surface-card p-6 rounded-[var(--radius-lg)]">
            <h3 className="font-bold text-[var(--foreground)] mb-5 text-sm uppercase tracking-widest">Common Phrases</h3>
            <div className="space-y-3">
              {COMMON_PHRASES.map((phrase, i) => (
                <div key={i} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--panel-border)] hover:border-[var(--brand-primary)]/25 dark:hover:border-[var(--brand-primary)]/30 transition-all group">
                  <p className="text-sm font-bold text-[var(--foreground)] mb-1">{phrase.english}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-3">{phrase.asl_note}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => animateAvatar(phrase.english)}
                      className="text-[9px] font-bold uppercase tracking-widest text-[var(--brand-primary)] dark:text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-2.5 py-1.5 rounded flex items-center gap-1.5 hover:bg-[var(--brand-primary-hover)]/20 transition-colors"
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
            </div>
          </div>
        </aside>
      </div>
      </div>
    </DashboardLayout>
  );
}
