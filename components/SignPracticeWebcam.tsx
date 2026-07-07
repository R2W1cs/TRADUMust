"use client";

import { useRef, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { classifyLandmarks } from "@/lib/landmark-classifier";
import { signAiApi } from "@/lib/tradumust-api";
import type { SignLanguageCode } from "@/lib/sign-languages";

interface SignPracticeWebcamProps {
  targetSign: string;
  onValidated: () => void;
  className?: string;
  signLanguage?: SignLanguageCode;
}

export function SignPracticeWebcam({
  targetSign,
  onValidated,
  className,
  signLanguage = "ASL",
}: SignPracticeWebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognizerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const motionBufferRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const holdCountRef = useRef(0);
  const validatedRef = useRef(false);
  const classifyCooldownRef = useRef(0);
  const tslDetectedRef = useRef<string | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [lastDetected, setLastDetected] = useState<string | null>(null);

  const normalizeKey = (s: string) => s.toUpperCase().replace(/_/g, " ").replace(/-/g, " ").trim();
  const targetNorm = normalizeKey(targetSign);
  const useTslModel = signLanguage === "TSL";

  useEffect(() => {
    validatedRef.current = false;
    holdCountRef.current = 0;
  }, [targetSign]);

  useEffect(() => {
    let animationFrameId: number;
    let lastVideoTime = -1;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => videoRef.current?.play();
        }

        const { GestureRecognizer, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
        );
        recognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "/models/gesture_recognizer.task", delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 2,
        });

        setModelReady(true);

        const loop = () => {
          const video = videoRef.current;
          const recognizer = recognizerRef.current;

          if (video && recognizer && video.currentTime !== lastVideoTime && video.readyState >= 2) {
            lastVideoTime = video.currentTime;
            const results = recognizer.recognizeForVideo(video, performance.now());

            let detectedKey: string | null = null;

            if (results.landmarks && results.landmarks.length > 0) {
              const lm1 = results.landmarks[0];
              const lm2 = results.landmarks[1];
              const palm = lm1[0];
              const now = performance.now();
              motionBufferRef.current.push({ x: palm.x, y: palm.y, time: now });
              if (motionBufferRef.current.length > 40) motionBufferRef.current.shift();

              if (useTslModel) {
                if (now - classifyCooldownRef.current > 400) {
                  classifyCooldownRef.current = now;
                  const toLm = (lm: { x: number; y: number; z?: number }) => ({
                    x: lm.x,
                    y: lm.y,
                    z: lm.z ?? 0,
                  });
                  signAiApi
                    .classify({
                      right_hand: lm1.map(toLm),
                      left_hand: lm2?.map(toLm),
                      sign_language: "TSL",
                    })
                    .then((r) => {
                      if (r.predicted_sign) {
                        tslDetectedRef.current = r.predicted_sign;
                        setLastDetected(r.predicted_sign);
                      }
                    })
                    .catch(() => {});
                }
                detectedKey = tslDetectedRef.current;
              } else {
                const classified = classifyLandmarks(lm1, motionBufferRef.current, lm2);
                if (classified) {
                  detectedKey = classified.key;
                } else if (results.gestures?.length > 0 && results.gestures[0][0]?.categoryName !== "None") {
                  detectedKey = results.gestures[0][0].categoryName;
                }
              }
            }

            if (detectedKey) {
              if (!useTslModel) setLastDetected(detectedKey);
              if (!validatedRef.current && normalizeKey(detectedKey) === targetNorm) {
                holdCountRef.current += 1;
                if (holdCountRef.current >= 6) {
                  validatedRef.current = true;
                  onValidated();
                }
              } else {
                holdCountRef.current = 0;
              }
            } else {
              holdCountRef.current = 0;
            }
          }

          animationFrameId = requestAnimationFrame(loop);
        };
        loop();
      } catch (err) {
        console.error("Webcam/Recognition failed", err);
      }
    };

    start();

    return () => {
      cancelAnimationFrame(animationFrameId);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSign, onValidated, signLanguage, useTslModel]);

  return (
    <div className={`relative rounded-3xl overflow-hidden bg-slate-900 border border-white/10 ${className}`}>
      {!modelReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-3" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            {useTslModel ? "Loading TSL vision model" : "Initializing Vision Engine"}
          </p>
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full h-full object-cover scale-x-[-1]"
        playsInline
        muted
      />
      {modelReady && (
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center z-10">
          <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white">
              {useTslModel ? "TSL ML Camera" : "Live Camera Active"}
            </span>
          </div>
          {lastDetected && (
            <div
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                normalizeKey(lastDetected) === targetNorm
                  ? "bg-green-500/20 text-green-400 border-green-500/40"
                  : "bg-brand-primary/20 text-brand-primary border-brand-primary/40"
              }`}
            >
              Detected: {lastDetected.replace(/_/g, " ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
