"use client";

import { useRef, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface SignPracticeWebcamProps {
  targetSign: string;
  onValidated: () => void;
  className?: string;
}

export function SignPracticeWebcam({ targetSign, onValidated, className }: SignPracticeWebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognizerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const motionBufferRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const [modelReady, setModelReady] = useState(false);
  const [lastDetected, setLastDetected] = useState<string | null>(null);

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
          baseOptions: {
            modelAssetPath: "/models/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
        });

        setModelReady(true);

        const loop = () => {
          const video = videoRef.current;
          const recognizer = recognizerRef.current;
          if (video && recognizer && video.currentTime !== lastVideoTime && video.readyState >= 2) {
            lastVideoTime = video.currentTime;
            const results = recognizer.recognizeForVideo(video, performance.now());
            
            let detectedSign = "";

            // --- Static Gesture Logic ---
            if (results.gestures && results.gestures.length > 0) {
              const category = results.gestures[0][0].categoryName;
              detectedSign = category;
            }

            // --- Dynamic Gesture Logic (Simplified) ---
            if (results.landmarks && results.landmarks.length > 0) {
              const palm = results.landmarks[0][0];
              const now = performance.now();
              motionBufferRef.current.push({ x: palm.x, y: palm.y, time: now });
              if (motionBufferRef.current.length > 30) motionBufferRef.current.shift();

              const buffer = motionBufferRef.current;
              if (buffer.length === 30) {
                const dy = buffer[29].y - buffer[0].y;
                if (dy > 0.15) detectedSign = "THANK_YOU"; // Palm down motion
              }
            }

            if (detectedSign) {
              setLastDetected(detectedSign);
              // Check if it matches target (normalization)
              if (normalize(detectedSign) === normalize(targetSign)) {
                onValidated();
              }
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
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [targetSign, onValidated]);

  return (
    <div className={`relative rounded-3xl overflow-hidden bg-slate-900 border border-white/10 ${className}`}>
      {!modelReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-3" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Initializing Vision Engine</p>
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
              <span className="text-[9px] font-black uppercase tracking-widest text-white">Live Camera Active</span>
           </div>
           {lastDetected && (
             <div className="bg-brand-primary/20 text-brand-primary border border-brand-primary/40 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                Detected: {lastDetected}
             </div>
           )}
        </div>
      )}
    </div>
  );
}

function normalize(s: string) {
  return s.toUpperCase().replace(/_/g, " ").trim();
}
