"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Globe, Loader2, RotateCcw, Sparkles, User } from "lucide-react";
import {
  ASL_AVATAR_OPTIONS,
  aslAvatarEmbedSrc,
  postPlayGlossesToAslAvatar,
  postPlayToAslAvatar,
  postResetAslAvatar,
  postSetAslAvatar,
  registerAslAvatarServiceWorker,
  type AslAvatarId,
} from "@/lib/asl-avatar-3d";
import {
  CWASA_COMING_SOON,
  CWASA_LIBRARY_LIST,
  getCwasaLibrary,
  type CwasaLibraryId,
} from "@/lib/cwasa-libraries";
import { loadGlossIndex, resolveNativeGlosses, type GlossIndex } from "@/lib/cwasa-gloss";
import { cn } from "@/lib/utils";

export interface AslAvatar3DHandle {
  play: (text: string) => void;
  reset: () => void;
  setAvatar: (avatar: AslAvatarId) => void;
  setLanguage: (language: CwasaLibraryId) => void;
}

interface AslAvatar3DProps {
  className?: string;
  defaultText?: string;
  defaultAvatar?: AslAvatarId;
  defaultLanguage?: CwasaLibraryId;
  /** Hide built-in input — parent drives signing via ref */
  embedOnly?: boolean;
  /** Show text field + Sign button below avatar */
  showControls?: boolean;
  /** Show Anna / Marc / Françoise picker */
  showAvatarPicker?: boolean;
  /** Show native library picker + coming-soon languages */
  showLanguagePicker?: boolean;
  minHeight?: number;
}

export const AslAvatar3D = forwardRef<AslAvatar3DHandle, AslAvatar3DProps>(function AslAvatar3D(
  {
    className,
    defaultText = "",
    defaultAvatar = "anna",
    defaultLanguage = "ASL",
    embedOnly = false,
    showControls = true,
    showAvatarPicker = true,
    showLanguagePicker = true,
    minHeight = 420,
  },
  ref
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const glossIndexRef = useRef<GlossIndex | null>(null);
  const [input, setInput] = useState(defaultText);
  const [avatar, setAvatar] = useState<AslAvatarId>(defaultAvatar);
  const [language, setLanguage] = useState<CwasaLibraryId>(defaultLanguage);
  const [iframeSrc] = useState(() =>
    aslAvatarEmbedSrc({
      embed: embedOnly || !showControls,
      avatar: defaultAvatar,
    })
  );
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [glossError, setGlossError] = useState<string | null>(null);

  const lib = getCwasaLibrary(language);

  useEffect(() => setInput(defaultText), [defaultText]);

  useEffect(() => {
    registerAslAvatarServiceWorker();
    loadGlossIndex()
      .then((idx) => {
        glossIndexRef.current = idx;
      })
      .catch(() => {
        setGlossError("SiGML libraries not built — run npm run cwasa:gloss");
      });
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const t = e.data?.type;
      if (t === "TRADUMUST_READY") {
        setReady(true);
        setLoading(false);
        if (e.data.avatar) setAvatar(e.data.avatar);
      }
      if (t === "TRADUMUST_AVATAR" && e.data.avatar) {
        setAvatar(e.data.avatar);
      }
      if (t === "TRADUMUST_SIGNING") {
        setSigning(true);
        setStatus(e.data.gloss ?? null);
        setGlossError(null);
      }
      if (t === "TRADUMUST_DONE") {
        setSigning(false);
        setStatus(null);
      }
      if (t === "TRADUMUST_RESET") {
        setSigning(false);
        setStatus(null);
      }
      if (t === "TRADUMUST_ERROR") {
        setSigning(false);
        setStatus(null);
        setGlossError(e.data.message ?? "No signs matched");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const play = useCallback(
    (text: string) => {
      setInput(text);
      setSigning(true);
      setGlossError(null);

      const index = glossIndexRef.current;
      const library = getCwasaLibrary(language);

      if (index) {
        const glosses = resolveNativeGlosses(text, language, index);
        if (glosses.length) {
          postPlayGlossesToAslAvatar(iframeRef.current, glosses, library.sigmlBase);
          return;
        }
        setSigning(false);
        setGlossError(`No ${library.label} signs matched — try words from that language's library`);
        return;
      }

      postPlayToAslAvatar(iframeRef.current, text);
    },
    [language]
  );

  const reset = useCallback(() => {
    postResetAslAvatar(iframeRef.current);
    setSigning(false);
    setStatus(null);
    setGlossError(null);
  }, []);

  const setAvatarChoice = useCallback((next: AslAvatarId) => {
    setAvatar(next);
  }, []);

  const setLanguageChoice = useCallback((next: CwasaLibraryId) => {
    setLanguage(next);
    const meta = getCwasaLibrary(next);
    setInput((prev) => (!prev.trim() ? meta.defaultText : prev));
    setGlossError(null);
  }, []);

  useEffect(() => {
    if (!ready) return;
    postSetAslAvatar(iframeRef.current, avatar);
  }, [ready, avatar]);

  useImperativeHandle(
    ref,
    () => ({ play, reset, setAvatar: setAvatarChoice, setLanguage: setLanguageChoice }),
    [play, reset, setAvatarChoice, setLanguageChoice]
  );

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {showLanguagePicker && !embedOnly && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose sign language">
            {CWASA_LIBRARY_LIST.map((opt) => {
              const active = language === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setLanguageChoice(opt.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                      : "border-[var(--panel-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                  )}
                >
                  <span aria-hidden>{opt.flag}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
            {CWASA_COMING_SOON.map((opt) => (
              <button
                key={opt.code}
                type="button"
                disabled
                title={opt.reason}
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[var(--panel-border)] px-3 py-2 text-sm font-semibold text-[var(--text-muted)] opacity-60 cursor-not-allowed"
              >
                <span aria-hidden>{opt.flag}</span>
                <span>{opt.label}</span>
                <span className="text-[10px] font-normal uppercase tracking-wide">Soon</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            {lib.hint}
          </p>
        </div>
      )}

      {showAvatarPicker && !embedOnly && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose avatar">
          {ASL_AVATAR_OPTIONS.map((opt) => {
            const active = avatar === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setAvatarChoice(opt.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "border-indigo-500 bg-indigo-500/15 text-indigo-400"
                    : "border-[var(--panel-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                )}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div
        className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-950 shadow-inner"
        style={{ minHeight }}
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading 3D avatar…</p>
            <p className="text-[10px] text-slate-500 mt-1">First load may take a few seconds</p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title="3D sign language avatar"
          className="w-full h-full min-h-[inherit] border-0"
          style={{ minHeight }}
          onLoad={() => {
            setLoading(true);
            setReady(false);
          }}
          allow="autoplay"
        />
      </div>

      {showControls && !embedOnly && (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && input.trim() && play(input.trim())}
            placeholder={lib.placeholder}
            dir={lib.inputScript === "arabic" ? "rtl" : "ltr"}
            className="flex-1 rounded-xl border border-[var(--panel-border)] bg-[var(--input-bg)] px-4 py-3 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <button
            type="button"
            onClick={() => input.trim() && play(input.trim())}
            disabled={!ready || signing || !input.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
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
      )}

      {status && (
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-indigo-400">
          Signing: {status}
        </p>
      )}

      {glossError && (
        <p className="text-center text-xs font-medium text-amber-500">{glossError}</p>
      )}
    </div>
  );
});
