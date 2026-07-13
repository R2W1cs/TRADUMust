"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { AslAvatar3D, type AslAvatar3DHandle } from "@/components/AslAvatar3D";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

const WELCOME_PHRASE = "hello welcome";
const GLOSS_CHIPS = ["HELLO", "WELCOME"];

export interface AuthWelcomeGateProps {
  open: boolean;
  mode: "login" | "register";
  userName?: string;
  onContinue: () => void;
}

export function AuthWelcomeGate({
  open,
  mode,
  userName,
  onContinue,
}: AuthWelcomeGateProps) {
  const avatarRef = useRef<AslAvatar3DHandle>(null);
  const [avatarReady, setAvatarReady] = useState(false);
  const [phase, setPhase] = useState<"enter" | "signing" | "ready">("enter");
  const [activeGloss, setActiveGloss] = useState(0);
  const continuedRef = useRef(false);

  const displayName = userName?.trim().split(/\s+/)[0] || null;
  const headline =
    mode === "login"
      ? displayName
        ? `Welcome back, ${displayName}`
        : "Welcome back"
      : displayName
        ? `Welcome in, ${displayName}`
        : "Welcome in";

  const subline =
    mode === "login"
      ? "Your signing host is greeting you in ASL"
      : "You're in — here's your ASL welcome";

  useEffect(() => {
    if (!open) {
      setAvatarReady(false);
      setPhase("enter");
      setActiveGloss(0);
      continuedRef.current = false;
      return;
    }

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "TRADUMUST_READY") setAvatarReady(true);
      if (e.data?.type === "TRADUMUST_SIGNING") setPhase("signing");
      if (e.data?.type === "TRADUMUST_DONE") setPhase("ready");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open]);

  useEffect(() => {
    if (!open || !avatarReady) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const kick = window.setTimeout(() => {
      avatarRef.current?.play(WELCOME_PHRASE);
      setPhase("signing");
      if (prefersReduced) {
        window.setTimeout(() => setPhase("ready"), 800);
      }
    }, 550);
    return () => window.clearTimeout(kick);
  }, [open, avatarReady]);

  useEffect(() => {
    if (!open || phase !== "signing") return;
    const id = window.setInterval(() => {
      setActiveGloss((i) => (i + 1) % GLOSS_CHIPS.length);
    }, 1800);
    return () => window.clearInterval(id);
  }, [open, phase]);

  // Auto-continue after signing finishes (with a short beat for the CTA)
  useEffect(() => {
    if (!open || phase !== "ready") return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = prefersReduced ? 900 : 2800;
    const id = window.setTimeout(() => {
      if (continuedRef.current) return;
      continuedRef.current = true;
      onContinue();
    }, delay);
    return () => window.clearTimeout(id);
  }, [open, phase, onContinue]);

  const handleContinue = () => {
    if (continuedRef.current) return;
    continuedRef.current = true;
    onContinue();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="auth-welcome-gate"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-welcome-title"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Atmosphere */}
          <motion.div
            className="absolute inset-0 bg-[#061018]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -left-1/4 top-[-20%] h-[70%] w-[70%] rounded-full bg-[radial-gradient(circle,rgba(14,165,201,0.35),transparent_65%)] blur-2xl"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-1/4 bottom-[-10%] h-[60%] w-[60%] rounded-full bg-[radial-gradient(circle,rgba(45,168,184,0.28),transparent_65%)] blur-2xl"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.15, ease: "easeOut" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-10">
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="scale-90"
            >
              <Logo />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.55 }}
              className="text-center"
            >
              <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                Signed in · ASL greeting
              </p>
              <h1
                id="auth-welcome-title"
                className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
              >
                {headline}
              </h1>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">{subline}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-lg"
            >
              <div className="absolute -inset-1 rounded-[1.35rem] bg-gradient-to-br from-cyan-400/40 via-teal-500/20 to-transparent blur-md" />
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
                <AslAvatar3D
                  ref={avatarRef}
                  embedOnly
                  showControls={false}
                  showAvatarPicker={false}
                  showLanguagePicker={false}
                  defaultLanguage="ASL"
                  defaultAvatar="anna"
                  minHeight={360}
                  className="[&>div]:rounded-none [&>div]:border-0"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-2"
            >
              {GLOSS_CHIPS.map((g, i) => (
                <span
                  key={g}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold tracking-wide transition-all duration-300",
                    phase === "signing" && i === activeGloss
                      ? "scale-105 bg-cyan-400 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.45)]"
                      : "bg-white/10 text-slate-200"
                  )}
                >
                  {g}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: phase === "ready" ? 1 : 0.55, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-3"
            >
              <button
                type="button"
                onClick={handleContinue}
                className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-100"
              >
                Continue to dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <p className="text-[11px] text-slate-400">
                {phase === "ready"
                  ? "Taking you in…"
                  : phase === "signing"
                    ? "Watch the greeting…"
                    : "Loading avatar…"}
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
