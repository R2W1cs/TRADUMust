"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Signer2D } from "./Signer2D";

export interface WordMeta {
  word: string;
  tag: string;
  duration_ms?: number;
}

const TAG_DURATIONS: Record<string, number> = {
  TIME: 900, SUBJECT: 1000, OBJECT: 1000, ACTION: 1300, MODIFIER: 800,
};
const DEFAULT_DURATION = 1100;

interface VisualGlossBoardProps {
  text?: string;
  autoPlay?: boolean;
  onComplete?: () => void;
  className?: string;
  sentiment?: { polarity: number; subjectivity: number };
  metadata?: WordMeta[];
}

export function VisualGlossBoard({
  text = "",
  autoPlay = false,
  onComplete,
  className = "",
  metadata = [],
}: VisualGlossBoardProps) {
  const [entries, setEntries] = useState<WordMeta[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => {
    if (metadata && metadata.length > 0) {
      setEntries(metadata);
    } else if (text.trim()) {
      setEntries(
        text.trim().toUpperCase().split(/\s+/).filter(Boolean).map(w => ({ word: w, tag: "WORD" }))
      );
    } else {
      setEntries([]);
    }
    setActiveIndex(-1);
  }, [text, metadata]);

  useEffect(() => {
    clearTimers();
    if (!autoPlay || entries.length === 0) return;

    function driveQueue(i: number) {
      if (i >= entries.length) {
        const t = setTimeout(() => { setActiveIndex(-1); onComplete?.(); }, 300);
        timers.current.push(t);
        return;
      }
      const entry = entries[i];
      const holdMs = entry.duration_ms ?? TAG_DURATIONS[entry.tag] ?? DEFAULT_DURATION;
      setActiveIndex(i);
      const t = setTimeout(() => driveQueue(i + 1), holdMs + 120);
      timers.current.push(t);
    }

    const t = setTimeout(() => driveQueue(0), 200);
    timers.current.push(t);
    return clearTimers;
  }, [autoPlay, entries, onComplete, clearTimers]);

  const active = activeIndex >= 0 ? entries[activeIndex] : null;

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <Signer2D word={active?.word ?? ""} tag={active?.tag} className="w-56 h-56" />
      <div className={`h-6 transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0"}`}>
        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          {active?.word ?? "​"}
        </span>
      </div>
    </div>
  );
}
