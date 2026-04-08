"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Signer2D } from "@/components/Signer2D";
import { type WordMeta } from "@/components/VisualGlossBoard";

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
    body: "Raised eyebrows = yes/no question. Furrowed brows + forward lean = wh-question (who, what, where). These facial markers are not optional — they change the sentence type.",
  },
  {
    icon: "🌍",
    title: "ASL ≠ Universal",
    body: "There is no universal sign language. British Sign Language (BSL) and ASL are mutually unintelligible. France has LSF, Japan has JSL. This platform focuses on ASL.",
  },
];

const COMMON_PHRASES: CommonPhrase[] = [
  { english: "Where is the library?", asl_note: "Use LIBRARY + WHERE with furrowed brows and forward head tilt.", fingerspelling: "LIBRARY" },
  { english: "I don't understand.", asl_note: "Touch forehead with index finger, then shake hand outward — a very common and important phrase.", fingerspelling: undefined },
  { english: "Can you repeat that?", asl_note: "Circle dominant hand palm-up, or simply sign AGAIN.", fingerspelling: undefined },
  { english: "My name is...", asl_note: "Sign MY + NAME + dominant-H taps non-dominant-H. Then fingerspell your name.", fingerspelling: "NAME" },
  { english: "Nice to meet you.", asl_note: "NICE + MEET + YOU. One of the most important social phrases for exchange students.", fingerspelling: undefined },
];

// ── Hand Shape Translation Map ───────────────────────────────────────────────
const GESTURE_TRANSLATIONS: Record<string, { meaning: string; notes: string }> = {
  "Thumb Up": { meaning: "Good / Approve", notes: "In ASL, 'Good' is often signed from the chin down, but a thumbs up is a universal approval marker." },
  "Thumb Down": { meaning: "Bad / Disapprove", notes: "Universally understood as a negative response." },
  "Open Palm": { meaning: "Stop / Wait / 5", notes: "An open palm facing forward can mean wait or stop. It is also the number 5, or the base for 'Hello'." },
  "Closed Fist": { meaning: "Yes / Letter 'S'", notes: "A closed fist with the thumb across it indicates the letter S or A, and nodding a fist means 'Yes'." },
  "Pointing Up": { meaning: "You / Look Up / Letter 'D'", notes: "A single index finger pointing up is the letter D, or pointing to someone/something." },
  "Victory": { meaning: "Peace / Number 2 / Letter 'V'", notes: "The classic V sign translates directly to the letter V and the number 2 in ASL." },
  "ILoveYou": { meaning: "I Love You", notes: "A classic ASL sign combining the letters I, L, and Y into a single universal handshape." },
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
          // 1. Get Camera
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => videoRef.current?.play();
          }

          // 2. Load ML Model dynamically to avoid SSR crashes
          if (!recognizerRef.current) {
            const { GestureRecognizer, FilesetResolver } = await import("@mediapipe/tasks-vision");
            const vision = await FilesetResolver.forVisionTasks(
              "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
            );
            recognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: "/models/gesture_recognizer.task",
                delegate: "GPU"
              },
              runningMode: "VIDEO",
              numHands: 2,
            });
          }
          setModelReady(true);

          // 3. Track Frames
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
                // Determine layout exact size
                canvas.width = video.clientWidth;
                canvas.height = video.clientHeight;
                
                // Flip horizontally so the drawing aligns with mirrored video
                ctx.save();
                ctx.scale(-1, 1);
                ctx.translate(-canvas.width, 0);

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                if (results.landmarks && results.landmarks.length > 0) {
                  const drawingUtils = new DrawingUtils(ctx);
                  const landmarks = results.landmarks[0];
                  
                  // Extract Palm Center for Motion Tracking
                  const palm = landmarks[0];
                  const now = performance.now();
                  motionBufferRef.current.push({ x: palm.x, y: palm.y, time: now });
                  if (motionBufferRef.current.length > 40) motionBufferRef.current.shift();

                  // ── Pattern Recognition AI Engine (Handcrafted professional logic) ──
                  const buffer = motionBufferRef.current;
                  if (buffer.length === 40) {
                    const dx = buffer[39].x - buffer[0].x;
                    const dy = buffer[39].y - buffer[0].y;
                    // 1. Detect Forward Push (e.g., "THANK YOU" move)
                    if (dy > 0.2 && Math.abs(dx) < 0.1) {
                       onRecognize("DYNAMIC_THANK_YOU");
                    }

                    // 2. Detect Circular Motion (e.g., "PLEASE")
                    const midX = buffer.reduce((a, b) => a + b.x, 0) / 40;
                    const midY = buffer.reduce((a, b) => a + b.y, 0) / 40;
                    const variances = buffer.map(p => Math.sqrt((p.x - midX)**2 + (p.y - midY)**2));
                    const avgRadius = variances.reduce((a, b) => a + b, 0) / 40;
                    const stdDev = Math.sqrt(variances.reduce((a, b) => a + (b - avgRadius)**2, 0) / 40);
                    
                    if (avgRadius > 0.05 && stdDev < 0.02) {
                       onRecognize("DYNAMIC_PLEASE");
                    }
                  }

                  for (const lms of results.landmarks) {
                    const pixelLandmarks = lms.map((l: any) => ({
                       x: l.x * canvas.width,
                       y: l.y * canvas.height,
                       z: l.z || 0
                    }));
                    drawingUtils.drawConnectors(pixelLandmarks, GestureRecognizer.HAND_CONNECTIONS, {
                      color: "#4ade80",
                      lineWidth: 4
                    });
                    drawingUtils.drawLandmarks(pixelLandmarks, {
                      color: "#a855f7",
                      lineWidth: 2,
                      radius: 3
                    });
                  }
                }
                ctx.restore();
                
                if (results.gestures && results.gestures.length > 0 && results.gestures[0].length > 0) {
                  const gesture = results.gestures[0][0];
                  if (gesture.categoryName !== "None") {
                    onRecognize(gesture.categoryName.replace("_", " "));
                  }
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
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-inner">
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
        style={{ transform: "scaleX(-1)" }} 
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {!active && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="text-5xl">📷</div>
          <p className="text-white/60 text-sm">Camera off</p>
        </div>
      )}

      {active && !modelReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/50 backdrop-blur-sm">
          <span className="w-8 h-8 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
          <p className="text-white font-medium text-sm drop-shadow-md">Loading ML Model...</p>
        </div>
      )}

      {active && modelReady && (
        <div className="absolute bottom-3 left-3 right-3 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center justify-between border border-slate-700">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
            <span className="text-green-300 text-xs font-semibold tracking-wide">AI Model Active & Tracking Hands</span>
          </div>
        </div>
      )}

      <button
        onClick={onToggle}
        title={active ? "Stop Camera" : "Start Camera"}
        className={`absolute top-4 right-4 p-2.5 rounded-full shadow-lg transition-all z-10 ${
          active ? "bg-red-500 hover:bg-red-400 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {active ? (
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          ) : (
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          )}
        </svg>
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
  const signTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // AI Stability: Temporal Smoothing for Gestures
  const smoothingBufferRef = useRef<Record<string, number>>({});
  const SMOOTHING_THRESHOLD = 8; // Need 8 frames of consistency

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % SIGN_TIPS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Ensure recognizing state correctly reflects loading or active model
  useEffect(() => {
    if (!cameraActive) {
      setRecognizedText("");
      setSentenceBuffer([]); // clear sentence when camera turns off
    }
  }, [cameraActive]);

  // ── New: Sentence Aggregation ──
  const [sentenceBuffer, setSentenceBuffer] = useState<string[]>([]);
  // To avoid spamming the same sign 10x per second, we keep track of the last added sign
  const lastAddedSignRef = useRef<string | null>(null);
  const signHoldTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleRecognize = useCallback((rawLabel: string) => {
    // 1. Stability Filter: Increment count for this sign
    const buffer = smoothingBufferRef.current;
    Object.keys(buffer).forEach(k => { if (k !== rawLabel) buffer[k] = Math.max(0, buffer[k] - 1); });
    buffer[rawLabel] = (buffer[rawLabel] || 0) + 1;

    // Only commit if we have enough confidence (consistency over time)
    if (buffer[rawLabel] < SMOOTHING_THRESHOLD) return;

    setRecognizedText(rawLabel);
    setRecognizing(false);
    
    // Convert to a short, usable word for the sentence
    const SHORT_TERMS: Record<string, string> = {
      "Thumb Up": "Good",
      "Thumb Down": "Bad",
      "Open Palm": "Wait",
      "Closed Fist": "Yes",
      "Pointing Up": "You",
      "Victory": "Peace",
      "ILoveYou": "Love",
      "DYNAMIC_THANK_YOU": "Thank You",
      "DYNAMIC_PLEASE": "Please",
    };
    
    const word = SHORT_TERMS[rawLabel];
    if (!word) return;

    // Only add if it's different from the very last sign we added, OR if enough time has passed.
    // For MVP, simply requiring them to change signs to add a new word is easiest.
    if (lastAddedSignRef.current !== rawLabel) {
       // Debounce slightly to ensure they hold the sign for ~500ms
       if (signHoldTimerRef.current) clearTimeout(signHoldTimerRef.current);
       
       signHoldTimerRef.current = setTimeout(() => {
           setSentenceBuffer(prev => [...prev, word]);
           lastAddedSignRef.current = rawLabel;
       }, 500);
    }
  }, []);

  // Animate avatar word-by-word with AI Glossing
  const animateAvatar = useCallback(async () => {
    if (!expressInput.trim()) return;
    setAvatarAnimating(true);
    
    try {
      const response = await fetch("http://127.0.0.1:8000/api/text-to-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: expressInput, sign_language: "ASL" })
      });
      
      if (response.ok) {
        const data = await response.json();

        // Build a duration lookup from animation_clips: word → duration_ms
        const durationMap: Record<string, number> = {};
        if (Array.isArray(data.animation_clips)) {
          for (const clip of data.animation_clips) {
            durationMap[clip.word?.toUpperCase()] = clip.duration_ms;
          }
        }

        // Merge duration_ms into each metadata entry
        const mergedMeta: WordMeta[] = (data.syntactic_metadata ?? []).map(
          (m: { word: string; tag: string }) => ({
            ...m,
            duration_ms: durationMap[m.word?.toUpperCase()],
          })
        );

        setGlossData({ sentiment: data.sentiment, metadata: mergedMeta });

        // Let VisualGlossBoard's onComplete fire naturally; fall back to a
        // computed timeout so the button re-enables even if onComplete is missed.
        const totalDuration = mergedMeta.reduce((acc, m) => acc + (m.duration_ms ?? 1100), 0);
        setTimeout(() => setAvatarAnimating(false), totalDuration + 1000);
      } else {
        setAvatarAnimating(false);
      }
    } catch (err) {
      console.error("AI Fetch Error:", err);
      setAvatarAnimating(false);
    }
  }, [expressInput]);

  // Drive Signer2D word-by-word from glossData.metadata
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">
            ← TRADUMUST
          </Link>
          <h1 className="font-bold text-slate-900">Sign Language Bridge</h1>
          <Link href="/translate" className="text-sm text-blue-600 hover:underline font-medium">
            🌐 Translate
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
        {/* ── Main Panel ── */}
        <div className="flex-1 min-w-0">
          {/* Mode Toggle */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Choose your communication direction:</p>
            <div className="flex bg-white rounded-xl border border-slate-200 p-1 w-fit">
              <button
                onClick={() => setMode("understand")}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                  mode === "understand"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>👀</span> I want to understand Sign
              </button>
              <button
                onClick={() => setMode("express")}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                  mode === "express"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🗣️</span> I want to express in Sign
              </button>
            </div>
          </div>

          {/* ── Mode A: Understand Sign ── */}
          {mode === "understand" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-bold text-slate-900">Webcam Sign Recognition</h2>
                  {cameraActive ? (
                    <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full border border-green-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                      Camera Active — Show your hands
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">Camera Off</span>
                  )}
                </div>

                <WebcamFeed 
                  active={cameraActive} 
                  onToggle={() => setCameraActive((v) => !v)} 
                  onRecognize={handleRecognize}
                />
              </div>

              {/* Recognition output */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold text-slate-800">Recognized Text</h3>
                  {recognizing && (
                    <span className="flex items-center gap-1.5 text-xs text-blue-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
                      Processing...
                    </span>
                  )}
                </div>

                <div className="min-h-[120px] bg-slate-50 flex-col rounded-lg border border-slate-200 p-4 flex justify-center">
                  
                  {/* Accumulated Sentence Builder */}
                  {sentenceBuffer.length > 0 && (
                    <div className="mb-4 p-3 bg-white border border-purple-100 rounded-lg shadow-sm">
                      <p className="text-xs font-bold text-purple-600 uppercase mb-1">Constructed Sentence:</p>
                      <p className="text-2xl font-medium text-slate-800">
                        {sentenceBuffer.join(" ")}
                      </p>
                      <button 
                        onClick={() => setSentenceBuffer([])}
                        className="text-xs text-slate-400 hover:text-red-500 mt-2 transition-colors"
                      >
                        Clear Sentence
                      </button>
                    </div>
                  )}

                  {recognizedText ? (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-end gap-3 mb-1">
                        <p className="text-3xl font-bold text-purple-700">
                          {GESTURE_TRANSLATIONS[recognizedText]?.meaning || recognizedText}
                        </p>
                        <span className="text-xs font-mono bg-slate-200 text-slate-600 px-2 py-1 rounded mb-1">
                          Raw: {recognizedText}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed max-w-lg mt-2">
                        {GESTURE_TRANSLATIONS[recognizedText]?.notes || 
                         "Raw ML output detected without a specific mapped cultural context."}
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">
                      {cameraActive
                        ? "Analyzing hand landmarks... hold up a sign!"
                        : "Start your camera to begin sign recognition."}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-lg">📖</span>
                  <div>
                    <p className="text-xs font-semibold text-amber-800 mb-0.5">Cultural Context</p>
                    <p className="text-sm text-amber-900">
                      In ASL, raised eyebrows indicate a yes/no question, while furrowed brows with a forward lean mark
                      wh-questions (who, what, where). These facial expressions are grammatically required — not just emotional cues.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-3">
                  ℹ️ Powered by Google MediaPipe Tasks Vision edge ML. Everything runs locally; zero latency.
                </p>
              </div>
            </div>
          )}

          {/* ── Mode B: Express in Sign ── */}
          {mode === "express" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-bold text-slate-900 mb-4">Text → Signing Avatar</h2>

                <div className="flex gap-3 mb-4">
                  <input
                    type="text"
                    value={expressInput}
                    onChange={(e) => setExpressInput(e.target.value)}
                    placeholder="Type what you want to sign..."
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={animateAvatar}
                    disabled={avatarAnimating || !expressInput.trim()}
                    className="flex items-center gap-2 bg-purple-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 whitespace-nowrap"
                  >
                    {avatarAnimating ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Signing...
                      </>
                    ) : (
                      "👐 Animate Avatar"
                    )}
                  </button>
                </div>

                <div className="flex flex-col items-center bg-white border border-slate-200 rounded-2xl py-6">
                  <Signer2D
                    word={currentSign?.word ?? ""}
                    tag={currentSign?.tag}
                    className="w-72 h-80"
                  />
                  <p className={`mt-2 text-sm font-bold tracking-widest uppercase transition-opacity duration-300 ${currentSign ? "opacity-100 text-purple-600" : "opacity-0 text-slate-400"}`}>
                    {currentSign?.word ?? "​"}
                  </p>
                </div>

                <div className="mt-4 flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <span className="text-lg">📖</span>
                  <div>
                    <p className="text-xs font-semibold text-purple-800 mb-0.5">Did you know?</p>
                    <p className="text-sm text-purple-900">
                      Some signs vary by region — what is signed in New York may differ subtly from California ASL.
                      This avatar uses <strong>General ASL</strong> based on standardized dictionaries.
                      Black ASL (BASL) also has distinct variations that are culturally significant.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <aside className="w-72 shrink-0 hidden lg:flex flex-col gap-4">
          {/* Today's Sign Tip */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-200 mb-3">Today&apos;s Sign Tip</p>
            <div className="text-3xl mb-2">{currentTip.icon}</div>
            <h3 className="font-bold text-lg mb-2">{currentTip.title}</h3>
            <p className="text-sm text-purple-100 leading-relaxed">{currentTip.body}</p>

            <div className="flex gap-1.5 mt-4">
              {SIGN_TIPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTipIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === tipIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"}`}
                />
              ))}
            </div>
          </div>

          {/* Common Phrases */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span>📋</span> Common Phrases for Exchange Students
            </h3>
            <div className="space-y-3">
              {COMMON_PHRASES.map((phrase, i) => (
                <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-purple-200 hover:bg-purple-50/30 transition-colors">
                  <p className="text-sm font-semibold text-slate-800 mb-1">{phrase.english}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{phrase.asl_note}</p>
                  {phrase.fingerspelling && (
                    <button
                      onClick={() => {
                        setExpressInput(phrase.fingerspelling!);
                        setMode("express");
                      }}
                      className="mt-1.5 text-xs text-purple-600 hover:underline"
                    >
                      ✋ Practice fingerspelling
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Regional Variation Alert */}
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="flex items-start gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-xs font-bold text-amber-800 mb-1">Regional Variation Alert</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  ASL is used primarily in the US and English-speaking Canada. Other countries use distinct sign languages:
                  British Sign Language (BSL), French Sign Language (LSF), Japanese Sign Language (JSL), etc.
                  Always clarify which sign language your Deaf peer uses.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
