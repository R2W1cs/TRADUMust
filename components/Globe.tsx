"use client";

import React, { useEffect, useRef } from "react";
import createGlobe from "cobe";
import { useTheme } from "@/lib/theme-context";

export function Globe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mode } = useTheme();

  useEffect(() => {
    let phi = 0;

    if (!canvasRef.current) return;

    // Dark mode = true -> background is dark, lines are bright.
    // Light mode = false -> background is light, lines are dark.
    const isDark = mode === "dark";

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 800,
      height: 800,
      phi: 0,
      theta: 0.3,
      dark: isDark ? 1 : 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: isDark ? [0.1, 0.1, 0.1] : [0.95, 0.95, 0.95],
      markerColor: [0.38, 0.39, 0.93],
      glowColor: isDark ? [0.1, 0.1, 0.2] : [0.9, 0.9, 0.95],
      markers: [
        { location: [37.7595, -122.4367], size: 0.03 },
        { location: [48.8566, 2.3522], size: 0.03 },
        { location: [35.6762, 139.6503], size: 0.03 },
      ],
      onRender: (state: { phi: number }) => {
        state.phi = phi;
        phi += 0.005;
      },
    } as Parameters<typeof createGlobe>[1]);

    return () => {
      globe.destroy();
    };
  }, [mode]);

  return (
    <div className={`relative w-full aspect-square max-w-[600px] mx-auto flex items-center justify-center ${className || ""}`}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", contain: "layout paint size" }}
      />
      {/* Overlay gradient to blend bottom edge with the panel */}
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[var(--panel-bg)] to-transparent pointer-events-none" />
    </div>
  );
}
