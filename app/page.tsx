"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, HandMetal, BookOpen, Sparkles, ArrowRight, MessageCircle, Target, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";
import { Logo } from "@/components/Logo";

// --- Data ---
const FEATURE_CARDS = [
  {
    icon: Globe,
    title: "Learn Spoken Languages",
    description: "Real-time text and voice translation with rich cultural context notes — understand not just what to say, but why it matters.",
    badge: "15+ Languages",
    href: "/translate",
    cta: "Try Translation",
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: HandMetal,
    title: "Bridge to Sign",
    description: "Communicate with Deaf peers using your webcam for sign recognition and an animated 3D avatar for sign expression.",
    badge: "ASL Supported",
    href: "/sign",
    cta: "Explore Sign Language",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: BookOpen,
    title: "Build Your Phrasebook",
    description: "Save essential phrases from every session and review them with built-in practice quizzes — perfect for exchange prep.",
    badge: "Study Mode",
    href: "/phrasebook",
    cta: "View Phrasebook",
    color: "from-emerald-400 to-teal-500",
  },
  {
    icon: Sparkles,
    title: "Social Sandbox",
    description: "Practice real-world cultural interactions in a branching AI-guided simulation to master social etiquette.",
    badge: "New Simulation",
    href: "/sandbox",
    cta: "Start Roleplaying",
    color: "from-orange-400 to-rose-500",
  },
];

const DEMO_TABS = [
  { id: "translate",   label: "Translate", icon: MessageCircle },
  { id: "sign",        label: "Sign",      icon: HandMetal },
  { id: "phrasebook",  label: "Review",    icon: BookOpen },
];

function DemoWidget() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % DEMO_TABS.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-2xl glass-panel group">
      {/* Mac-like header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[var(--input-bg)] border-b border-[var(--panel-border)]">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-amber-500/80" />
          <span className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="mx-auto flex gap-6">
          {DEMO_TABS.map((tab, i) => {
            const Icon = tab.icon;
            const isActive = active === i;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(i)}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-all duration-300",
                  isActive
                    ? "text-[var(--brand-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6 h-[300px] relative bg-[var(--panel-bg)] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* Translate tab */}
          {active === 0 && (
            <motion.div key="translate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-4 max-w-lg mx-auto w-full">
              <div className="bg-[var(--input-bg)] p-4 rounded-xl border border-[var(--panel-border)] shadow-inner">
                <p className="text-[var(--text-secondary)] text-sm">"Hello, how are you?"</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-blue-500 dark:text-blue-400 justify-center">
                <Sparkles className="w-4 h-4 animate-pulse" /> Automatically translating to French
              </div>
              <div className="bg-gradient-to-r from-blue-500/8 to-indigo-500/8 dark:from-blue-900/40 dark:to-indigo-900/40 p-5 rounded-xl border border-blue-400/20 dark:border-blue-500/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
                <p className="text-[var(--foreground)] font-medium text-lg mb-3">Bonjour, comment allez-vous ?</p>
                <div className="bg-[var(--input-bg)] p-3 rounded-lg border border-[var(--panel-border)] flex gap-3 items-start">
                  <Globe className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Cultural Note:</span>{" "}
                    Use "vous" (formal) with professors and strangers. "Tu" is restricted to close friends.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Sign tab */}
          {active === 1 && (
            <motion.div key="sign" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-4 max-w-lg mx-auto w-full">
              <div className="flex justify-between items-center mb-2">
                <div className="bg-[var(--input-bg)] px-4 py-2 rounded-lg border border-[var(--panel-border)] text-sm text-[var(--text-secondary)] flex-1 mr-4 shadow-inner text-center md:text-left">
                  Nice to meet you
                </div>
                <button className="bg-purple-600 hover:bg-purple-500 text-white text-sm px-5 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-purple-500/20">Animate</button>
              </div>
              {/* Avatar preview — dark canvas is intentional for video contrast */}
              <div className="h-40 rounded-xl bg-gradient-to-br from-slate-900 to-purple-950 border border-purple-500/30 flex items-center justify-center relative overflow-hidden shadow-inner">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                <div className="flex flex-col items-center">
                  <div className="text-5xl animate-bounce mb-3">🧑‍🦱</div>
                  <p className="text-xs text-purple-300 font-medium uppercase tracking-widest bg-purple-900/50 px-3 py-1 rounded-full border border-purple-500/30">3D Avatar Signing</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Phrasebook tab */}
          {active === 2 && (
            <motion.div key="phrasebook" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-2 gap-4">
              {[
                { s: "Hello",       t: "Bonjour",     l: "FR" },
                { s: "Thank you",   t: "Gracias",      l: "ES" },
                { s: "Excuse me",   t: "すみません",   l: "JA" },
                { s: "Where is...?", t: "Où est...?",  l: "FR" },
              ].map((p, i) => (
                <div key={i} className="bg-[var(--input-bg)] p-4 rounded-xl border border-[var(--panel-border)] hover:border-emerald-400/40 transition-colors group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-400/5 rounded-full blur-xl -mr-5 -mt-5" />
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <p className="text-sm text-[var(--foreground)] font-medium">{p.s}</p>
                    <span className="text-[10px] bg-[var(--panel-bg)] border border-[var(--panel-border)] px-2 py-0.5 rounded text-[var(--text-muted)]">{p.l}</span>
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors relative z-10">{p.t}</p>
                </div>
              ))}
              <div className="col-span-2 mt-2">
                <button className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/30 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 text-sm py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2">
                  <Target className="w-4 h-4" /> Start Spaced Repetition Quiz
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-[var(--input-bg)]">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"
          key={active}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 5, ease: "linear" }}
        />
      </div>
    </div>
  );
}

function NavigationBar() {
  const [scrolled, setScrolled] = useState(false);
  const { mode, toggleMode } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-[var(--nav-bg)] backdrop-blur-xl border-b border-[var(--panel-border)] shadow-sm"
          : "bg-transparent py-2"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="group">
          <Logo
            iconClass="w-10 h-10 group-hover:shadow-purple-500/50 group-hover:scale-105 transition-all duration-300"
            textClass="text-xl group-hover:text-[var(--brand-primary)] transition-colors"
          />
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8 bg-[var(--panel-bg)] border border-[var(--panel-border)] px-8 py-3 rounded-full backdrop-blur-md shadow-sm">
          {[
            { label: "Translate",     href: "/translate" },
            { label: "Sign Language", href: "/sign" },
            { label: "Phrasebook",    href: "/phrasebook" },
            { label: "Sandbox",       href: "/sandbox" },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors relative group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-[var(--brand-primary)] group-hover:w-full transition-all duration-300" />
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleMode}
            className="p-2.5 rounded-2xl bg-[var(--panel-bg)] hairline-border text-[var(--text-muted)] hover:text-[var(--foreground)] transition-all shadow-sm group"
            title="Toggle Theme"
          >
            {mode === "dark"
              ? <Sun  className="w-5 h-5 group-hover:rotate-12  transition-transform" />
              : <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
            }
          </button>
          <Link
            href="/translate"
            className="hidden sm:inline-flex items-center gap-2 bg-[var(--brand-primary)] text-white hover:opacity-90 text-sm font-bold px-6 py-2.5 rounded-full transition-all duration-300 shadow-[0_4px_14px_0_rgba(79,70,229,0.25)] hover:shadow-[0_6px_20px_0_rgba(79,70,229,0.35)] hover:scale-105"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen font-sans overflow-hidden">
      <NavigationBar />

      {/* ── Hero ── */}
      <section className="relative pt-40 pb-20 px-6 flex flex-col items-center justify-center min-h-[95vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto text-center z-10"
        >
          {/* Eyebrow badge — theme-aware */}
          <div className="inline-flex items-center gap-2 bg-[var(--panel-bg)] border border-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-sm font-medium px-5 py-2 rounded-full mb-8 shadow-sm backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)] animate-pulse inline-block" />
            Designed for Exchange Programs &amp; Inclusive Learning
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-[var(--foreground)] leading-tight mb-6 tracking-tight">
            Break Language Barriers.
            <br />
            <span className="text-gradient">Build Human Connections.</span>
          </h1>

          <p className="text-xl md:text-2xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed mb-12 antialiased">
            An educational translation platform with cultural context and a real-time{" "}
            <strong className="text-[var(--foreground)] font-black underline decoration-[var(--brand-primary)] decoration-4">
              sign language bridge
            </strong>{" "}
            for truly inclusive communication.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-24">
            <Link
              href="/translate"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-[var(--brand-primary)] text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-all shadow-[0_0_30px_rgba(79,70,229,0.25)] hover:shadow-[0_0_40px_rgba(79,70,229,0.4)] group hover:-translate-y-1"
            >
              <Globe className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Try Translation
            </Link>
            <Link
              href="/sign"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--panel-bg)] text-[var(--foreground)] border border-[var(--panel-border)] font-semibold px-8 py-4 rounded-xl hover:bg-[var(--surface)] transition-all backdrop-blur-md group hover:-translate-y-1 shadow-sm"
            >
              <HandMetal className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
              Explore Sign Language
            </Link>
          </div>

          {/* Interactive hero widget */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <DemoWidget />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Feature Cards ── */}
      <section className="py-28 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[var(--brand-primary)] text-xs font-bold uppercase tracking-[0.2em] mb-4">The Platform</p>
            <h2 className="text-4xl md:text-5xl font-black text-[var(--foreground)] mb-5 tracking-tight">
              Everything you need to connect
            </h2>
            <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto leading-relaxed">
              Four tools. One platform. Built for exchange students and inclusive communication.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {FEATURE_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="group phrase-card rounded-3xl p-7 flex flex-col hover:-translate-y-2 transition-all duration-300"
                >
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm mb-6 group-hover:scale-105 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  <span className="inline-block text-[10px] font-bold px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--panel-border)] text-[var(--text-muted)] mb-5 uppercase tracking-widest w-fit">
                    {card.badge}
                  </span>

                  <h3 className="text-lg font-bold text-[var(--foreground)] mb-2.5 tracking-tight">{card.title}</h3>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6 flex-1">{card.description}</p>

                  <Link
                    href={card.href}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)] group-hover:gap-2.5 transition-all duration-200"
                  >
                    {card.cta} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA band — theme-adaptive ── */}
      <section className="relative overflow-hidden border-y border-[var(--panel-border)]">
        {/* Base surface */}
        <div className="absolute inset-0 bg-[var(--surface)]" />
        {/* Central radial glow — uses brand-primary for both modes */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[130%] bg-[var(--brand-primary)]/10 dark:bg-[var(--brand-primary)]/20 rounded-full blur-[120px] pointer-events-none" />
        {/* Side accent glows */}
        <div className="absolute top-0 left-0 w-[30%] h-full bg-[var(--brand-secondary)]/5 dark:bg-[var(--brand-secondary)]/10 blur-[80px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[30%] h-full bg-[var(--brand-primary)]/5 dark:bg-[var(--brand-primary)]/10 blur-[80px] pointer-events-none" />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, var(--foreground) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />

        <div className="relative max-w-3xl mx-auto px-6 py-28 text-center z-10">
          <p className="text-[var(--brand-primary)] text-xs font-bold uppercase tracking-[0.2em] mb-6">
            Ready when you are
          </p>
          <h2 className="text-5xl md:text-7xl font-black text-[var(--foreground)] mb-6 tracking-tighter leading-tight">
            Start Connecting
            <br />
            <span className="text-gradient">Today</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-xl mb-12 max-w-md mx-auto leading-relaxed">
            No account required. Open, translate, and start building real cultural understanding.
          </p>
          <Link
            href="/translate"
            className="inline-flex items-center justify-center gap-2 bg-[var(--brand-primary)] text-white font-bold px-10 py-4 rounded-full hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_4px_20px_rgba(79,70,229,0.28)] dark:shadow-[0_4px_20px_rgba(168,85,247,0.32)] hover:shadow-[0_8px_32px_rgba(79,70,229,0.38)] dark:hover:shadow-[0_8px_32px_rgba(168,85,247,0.42)]"
          >
            Launch TRADUMUST
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-[var(--panel-border)] bg-[var(--card-bg)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo iconClass="w-7 h-7 rounded-lg" textClass="text-sm" />
          <p className="text-[var(--text-muted)] text-sm">
            © {new Date().getFullYear()} · Educational platform for exchange programs &amp; inclusive communication.
          </p>
          <div className="flex items-center gap-5 text-sm text-[var(--text-secondary)]">
            <Link href="/translate"  className="hover:text-[var(--brand-primary)] transition-colors">Translate</Link>
            <Link href="/sign"       className="hover:text-[var(--brand-primary)] transition-colors">Sign</Link>
            <Link href="/phrasebook" className="hover:text-[var(--brand-primary)] transition-colors">Phrasebook</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
