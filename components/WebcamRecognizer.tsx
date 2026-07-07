"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Camera } from "lucide-react";

interface Props {
  active: boolean;
  onRecognize: (text: string, confidence: number) => void;
}

let sharedRecognizer: Awaited<ReturnType<typeof loadRecognizer>> | null = null;
let recognizerPromise: Promise<Awaited<ReturnType<typeof loadRecognizer>>> | null = null;

async function loadRecognizer() {
  const { GestureRecognizer, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
  );

  const modelPaths = [
    "/models/gesture_recognizer.task",
    "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
  ];

  for (const modelAssetPath of modelPaths) {
    for (const delegate of ["GPU", "CPU"] as const) {
      try {
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: { modelAssetPath, delegate },
          runningMode: "VIDEO",
          numHands: 2,
        });
        return recognizer;
      } catch {
        /* try next */
      }
    }
  }
  throw new Error("Could not load gesture recognizer");
}

function getRecognizer() {
  if (sharedRecognizer) return Promise.resolve(sharedRecognizer);
  if (!recognizerPromise) {
    recognizerPromise = loadRecognizer().then((r) => {
      sharedRecognizer = r;
      return r;
    });
  }
  return recognizerPromise;
}

export default function WebcamRecognizer({ active, onRecognize }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onRecognizeRef = useRef(onRecognize);
  const lastEmitRef = useRef(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  onRecognizeRef.current = onRecognize;

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!active) {
      stopStream();
      setStatus("idle");
      return;
    }

    let cancelled = false;
    let frameId = 0;
    let recognizer: Awaited<ReturnType<typeof loadRecognizer>> | null = null;
    let lastVideoTime = -1;

    const start = async () => {
      setStatus("loading");
      setErrorMsg("");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;

        await new Promise<void>((resolve, reject) => {
          const onReady = () => resolve();
          const onErr = () => reject(new Error("Video failed to load"));
          video.addEventListener("loadedmetadata", onReady, { once: true });
          video.addEventListener("error", onErr, { once: true });
          video.play().catch(reject);
        });

        if (cancelled) return;

        recognizer = await getRecognizer();
        if (cancelled) return;

        setStatus("ready");

        const loop = () => {
          if (cancelled || !videoRef.current || !recognizer) return;

          const v = videoRef.current;
          if (v.readyState >= 2 && v.currentTime > 0 && v.currentTime !== lastVideoTime) {
            lastVideoTime = v.currentTime;
            try {
              const result = recognizer.recognizeForVideo(v, performance.now());
              const gesture = result.gestures?.[0]?.[0];
              if (gesture && gesture.categoryName !== "None") {
                const now = performance.now();
                if (now - lastEmitRef.current > 120) {
                  lastEmitRef.current = now;
                  onRecognizeRef.current(gesture.categoryName.replace(/_/g, " "), gesture.score);
                }
              }
            } catch {
              /* skip frame */
            }
          }
          frameId = requestAnimationFrame(loop);
        };
        loop();
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(err instanceof Error ? err.message : "Camera unavailable");
          stopStream();
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      stopStream();
    };
  }, [active, stopStream]);

  return (
    <div className="relative w-full h-full min-h-[400px] bg-slate-950">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scaleX(-1)", opacity: active && status === "ready" ? 1 : 0 }}
        playsInline
        muted
        autoPlay
        aria-label="Webcam feed for sign recognition"
      />

      {status === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)]">
          <Camera className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">Camera is off</p>
        </div>
      )}

      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-white gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
          <p className="text-sm">Starting camera &amp; AI model…</p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 text-center px-6">
          <p className="text-red-400 font-medium mb-2">Camera error</p>
          <p className="text-sm text-[var(--text-secondary)]">{errorMsg || "Allow camera access and try again."}</p>
        </div>
      )}
    </div>
  );
}
