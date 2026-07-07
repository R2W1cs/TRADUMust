"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { TslSignImage } from "@/components/TslSignImage";
import {
  getTslSign,
  resolveTslGlosses,
  TSL_EXPRESS_META,
  TSL_SIGN_COUNT,
} from "@/lib/tsl-vocabulary";
import { cn } from "@/lib/utils";

const SIGN_DURATION_MS = 2200;

interface TslExpressSignerProps {
  className?: string;
  defaultText?: string;
  minHeight?: number;
}

export function TslExpressSigner({
  className,
  defaultText = TSL_EXPRESS_META.defaultText,
  minHeight = 480,
}: TslExpressSignerProps) {
  const [input, setInput] = useState(defaultText);
  const [glosses, setGlosses] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setInput(defaultText), [defaultText]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setPlaying(false);
    setGlosses([]);
    setIndex(0);
    setError(null);
  }, [clearTimer]);

  const play = useCallback(
    (text: string) => {
      clearTimer();
      setInput(text);
      const resolved = resolveTslGlosses(text);
      if (!resolved.length) {
        setPlaying(false);
        setGlosses([]);
        setIndex(0);
        setError(`No TSL signs matched — try words from the ${TSL_SIGN_COUNT}-sign dataset`);
        return;
      }
      setError(null);
      setGlosses(resolved);
      setIndex(0);
      setPlaying(true);
    },
    [clearTimer]
  );

  useEffect(() => {
    if (!playing || !glosses.length) return;
    if (index >= glosses.length) {
      setPlaying(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      setIndex((prev) => prev + 1);
    }, SIGN_DURATION_MS);
    return clearTimer;
  }, [playing, glosses, index, clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const currentGloss = glosses[index];
  const currentSign = currentGloss ? getTslSign(currentGloss) : undefined;
  const hasArabic = /[\u0600-\u06FF]/.test(input);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5 shrink-0" />
        {TSL_EXPRESS_META.hint}
      </p>

      <div
        className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-950 shadow-inner flex flex-col items-center justify-center"
        style={{ minHeight }}
      >
        {currentGloss ? (
          <>
            <div className="relative w-full flex-1 min-h-[360px]">
              <TslSignImage gloss={currentGloss} className="rounded-none" />
            </div>
            <div className="w-full px-4 py-3 bg-slate-900/90 border-t border-white/10 text-center space-y-1">
              <p className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
                {currentGloss.replace(/_/g, " ")}
              </p>
              {currentSign && (
                <p className="text-xs text-slate-400">
                  {currentSign.english}
                  {currentSign.arabic ? ` · ${currentSign.arabic}` : ""}
                </p>
              )}
              {glosses.length > 1 && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
                  Sign {index + 1} of {glosses.length}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <p className="text-sm font-semibold">Tunisian Sign Language</p>
            <p className="text-xs mt-2 max-w-xs">
              Type a phrase and press Sign — each word plays a real photo from the dataset.
            </p>
            <p className="text-[10px] mt-3 uppercase tracking-widest text-slate-600">
              {TSL_SIGN_COUNT} signs available
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && input.trim() && play(input.trim())}
          placeholder={TSL_EXPRESS_META.placeholder}
          dir={hasArabic ? "rtl" : "ltr"}
          className="flex-1 rounded-xl border border-[var(--panel-border)] bg-[var(--input-bg)] px-4 py-3 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
        <button
          type="button"
          onClick={() => input.trim() && play(input.trim())}
          disabled={playing || !input.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {playing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Sign
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--panel-border)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
        >
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      {error && <p className="text-center text-xs font-medium text-amber-500">{error}</p>}
    </div>
  );
}
