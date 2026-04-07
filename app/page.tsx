"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const FEATURE_CARDS = [
  {
    icon: "🌐",
    title: "Learn Spoken Languages",
    description:
      "Real-time text and voice translation with rich cultural context notes — understand not just what to say, but why it matters in that culture.",
    badge: "15+ Languages",
    href: "/translate",
    cta: "Try Translation",
    color: "from-blue-500 to-cyan-500",
    bgLight: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    icon: "🤝",
    title: "Bridge to Sign Language",
    description:
      "Communicate with Deaf and Hard of Hearing peers using your webcam for sign recognition and an animated 3D avatar for sign expression.",
    badge: "ASL Supported",
    href: "/sign",
    cta: "Explore Sign Language",
    color: "from-purple-500 to-pink-500",
    bgLight: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  {
    icon: "📚",
    title: "Build Your Phrasebook",
    description:
      "Save essential phrases from every translation session and review them with built-in practice quizzes — perfect for exchange program prep.",
    badge: "Study Mode",
    href: "/phrasebook",
    cta: "View Phrasebook",
    color: "from-emerald-500 to-teal-500",
    bgLight: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
];

const AUDIENCE_ITEMS = [
  {
    icon: "✈️",
    title: "International Exchange Students",
    desc: "Arriving in a new country? Navigate daily life, academic settings, and social situations with confidence.",
  },
  {
    icon: "🎓",
    title: "Language Learners",
    desc: "Go beyond translation. Learn cultural nuances, formality levels, and regional variations alongside every phrase.",
  },
  {
    icon: "👐",
    title: "Inclusive Campus Communities",
    desc: "Close the communication gap between hearing and Deaf/Hard of Hearing students with real-time sign language bridging.",
  },
];

// ── Demo Widget (replaces video placeholder) ──────────────────────────────
const DEMO_TABS = [
  {
    id: "translate",
    label: "🌐 Translate",
    content: (
      <div className="p-5 flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300">Auto-detect</div>
          <div className="w-8 h-8 rounded-lg bg-slate-600 flex items-center justify-center text-slate-400 text-xs">⇄</div>
          <div className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-sm text-blue-300">French</div>
        </div>
        <div className="bg-slate-700 rounded-xl p-4 text-sm text-white">"Hello, how are you?"</div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
          Live Translation On
        </div>
        <div className="bg-slate-700/60 rounded-xl p-4 border border-blue-500/30">
          <p className="text-blue-200 font-medium text-base mb-2">Bonjour, comment allez-vous ?</p>
          <div className="flex items-start gap-2 bg-amber-900/40 rounded-lg p-2.5 border border-amber-700/40">
            <span className="text-base">🌍</span>
            <p className="text-xs text-amber-300 leading-relaxed">
              <strong>Cultural Note:</strong> Use &quot;vous&quot; (formal) with professors and strangers — &quot;tu&quot; is only for close friends.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 text-xs bg-emerald-700/50 text-emerald-300 rounded-lg py-1.5 border border-emerald-600/40">📚 Save to Phrasebook</button>
          <button className="flex-1 text-xs bg-slate-600/50 text-slate-300 rounded-lg py-1.5 border border-slate-500/40">🔊 Speak</button>
        </div>
      </div>
    ),
  },
  {
    id: "sign",
    label: "👐 Sign",
    content: (
      <div className="p-5 flex flex-col gap-3">
        <div className="flex gap-2 bg-slate-700 rounded-lg p-1 w-fit">
          <span className="text-xs px-3 py-1.5 rounded-md bg-purple-600 text-white font-medium">Express in Sign</span>
          <span className="text-xs px-3 py-1.5 text-slate-400">Understand Sign</span>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300">Hello</div>
          <button className="bg-purple-600 text-white text-xs px-3 rounded-lg font-medium">Animate</button>
        </div>
        <div className="bg-gradient-to-br from-purple-900/60 to-indigo-900/60 rounded-xl border border-purple-500/30 h-24 flex items-center justify-center gap-4">
          <div className="text-center">
            <div className="text-3xl mb-1">🧑</div>
            <div className="text-xs text-purple-300">Avatar signing…</div>
          </div>
          <div className="flex gap-1">
            {["H","E","L","L","O"].map((l, i) => (
              <div key={i} className="w-7 h-8 bg-purple-800/60 border border-purple-500/40 rounded flex items-center justify-center text-xs text-purple-200 font-bold">{l}</div>
            ))}
          </div>
        </div>
        <div className="flex items-start gap-2 bg-purple-900/30 rounded-lg p-2.5 border border-purple-700/30">
          <span className="text-sm">📖</span>
          <p className="text-xs text-purple-300">ASL uses <strong>General American Sign Language</strong>. Signs may vary by region.</p>
        </div>
      </div>
    ),
  },
  {
    id: "phrasebook",
    label: "📚 Phrasebook",
    content: (
      <div className="p-5 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          {[
            { src: "Hello", tgt: "Bonjour", lang: "🇫🇷 FR", note: "Use 'vous' formally" },
            { src: "Thank you", tgt: "Gracias", lang: "🇪🇸 ES", note: "Bow head slightly" },
            { src: "Where is…?", tgt: "Où est… ?", lang: "🇫🇷 FR", note: "Formal tone needed" },
            { src: "Excuse me", tgt: "すみません", lang: "🇯🇵 JA", note: "Sumimasen — very common" },
          ].map((p, i) => (
            <div key={i} className="bg-slate-700/70 rounded-xl p-3 border border-slate-600/40">
              <p className="text-xs text-slate-400 mb-0.5">{p.lang}</p>
              <p className="text-sm text-white font-medium">{p.src}</p>
              <p className="text-xs text-blue-300 mb-1">{p.tgt}</p>
              <p className="text-xs text-amber-400 italic">{p.note}</p>
            </div>
          ))}
        </div>
        <button className="w-full text-xs bg-emerald-700/40 text-emerald-300 rounded-lg py-2 border border-emerald-600/30 font-medium">
          🎯 Start Practice Quiz (4 cards)
        </button>
      </div>
    ),
  },
] as const;

function DemoWidget() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % DEMO_TABS.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-800">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 pt-4 pb-0">
        {DEMO_TABS.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActive(i)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
              active === i
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex gap-1 pr-1">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-amber-500/70" />
          <span className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
      </div>

      {/* Panel */}
      <div className="bg-slate-800 min-h-[260px]">
        {DEMO_TABS[active].content}
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-slate-700">
        <div
          key={active}
          className="h-full bg-blue-500"
          style={{ animation: "progress 4s linear forwards" }}
        />
      </div>

      <style>{`@keyframes progress { from { width: 0% } to { width: 100% } }`}</style>

      <div className="px-4 py-3 bg-slate-900/60 text-center">
        <p className="text-slate-400 text-xs">
          📽️ See how TRADUMUST helps exchange students connect — from airport arrival to classroom discussions.
        </p>
      </div>
    </div>
  );
}

const HOW_IT_WORKS = [
  { step: "01", title: "Choose Your Mode", desc: "Text translation, voice input, or sign language bridge — pick what fits your situation." },
  { step: "02", title: "Communicate", desc: "Type, speak, or sign. Our platform processes input in real time." },
  { step: "03", title: "Understand the Context", desc: "Every result includes a Cultural Note explaining formality, regional use, and nuance." },
  { step: "04", title: "Build Your Knowledge", desc: "Save phrases to your Phrasebook and revisit them with our quiz-based Practice Mode." },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      {/* ── NAV ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/95 backdrop-blur-sm shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌉</span>
            <span className="font-bold text-lg text-slate-900">TRADUMUST</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="/translate" className="hover:text-blue-600 transition-colors">Translate</Link>
            <Link href="/sign" className="hover:text-purple-600 transition-colors">Sign Language</Link>
            <Link href="/phrasebook" className="hover:text-emerald-600 transition-colors">Phrasebook</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/translate"
              className="hidden sm:inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-blue-200 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
            Designed for Exchange Programs &amp; Inclusive Learning
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
            Break Language Barriers.
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              Build Human Connections.
            </span>
          </h1>

          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-10">
            An educational translation platform designed for exchange students and inclusive communication — with cultural context built into every translation.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/translate"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200"
            >
              🌐 Try Translation
            </Link>
            <Link
              href="/sign"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-purple-700 border-2 border-purple-300 font-semibold px-8 py-3.5 rounded-xl hover:bg-purple-50 active:scale-95 transition-all"
            >
              👐 Explore Sign Language
            </Link>
          </div>

          {/* ── Interactive Feature Demo ── */}
          <DemoWidget />
        </div>
      </section>

      {/* ── FEATURE CARDS ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Everything You Need to Connect</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Three powerful tools, one unified platform — all designed with education at the core.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURE_CARDS.map((card) => (
              <div
                key={card.title}
                className={`relative group rounded-2xl border ${card.borderColor} ${card.bgLight} p-7 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-2xl mb-5 shadow-md`}>
                  {card.icon}
                </div>
                <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 mb-3">
                  {card.badge}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{card.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">{card.description}</p>
                <Link
                  href={card.href}
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold bg-gradient-to-r ${card.color} bg-clip-text text-transparent group-hover:gap-2.5 transition-all`}
                >
                  {card.cta} <span>→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TARGET AUDIENCE ── */}
      <section className="py-20 px-6 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1 rounded-full mb-4">
              Who Is This For?
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              Designed for International Exchange Programs, Language Learners, and Inclusive Campus Communities
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              TRADUMUST was built specifically for the humans who navigate linguistic and cultural boundaries every day.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {AUDIENCE_ITEMS.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-7 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How It Works</h2>
            <p className="text-slate-500">From first input to cultural fluency — in four steps.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex gap-4 p-6 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                <span className="text-3xl font-black text-blue-200 shrink-0">{item.step}</span>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">{item.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USER RESEARCH ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block bg-emerald-100 text-emerald-700 text-sm font-semibold px-4 py-1 rounded-full mb-4">
              User Research
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Tested With Real Students</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Pilot study conducted with 5 participants at a university language lab · 3 task scenarios · <strong>SUS score 78 / 100</strong>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {[
              {
                avatar: "👩‍🎓",
                name: "Sara M.",
                role: "Exchange student, Korea → France",
                quote: "The cultural note saved me from accidentally using 'tu' with my professor on the first day. That would've been embarrassing.",
                rating: 5,
              },
              {
                avatar: "🧑‍💻",
                name: "David L.",
                role: "Hearing student, US campus",
                quote: "I used the sign language bridge to introduce myself to a Deaf classmate before I knew any ASL. It opened a real conversation.",
                rating: 5,
              },
              {
                avatar: "👩‍🦽",
                name: "Amira K.",
                role: "Deaf student, international program",
                quote: "Having the avatar explain spoken meeting content in sign is something I've never seen in a student tool before. I want this in every lecture.",
                rating: 4,
              },
            ].map((t) => (
              <div key={t.name} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{t.avatar}</span>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <span key={i} className="text-amber-400 text-xs">★</span>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex flex-wrap items-center justify-center gap-8 text-center">
            {[
              { value: "5", label: "Exchange students tested" },
              { value: "3", label: "Task scenarios" },
              { value: "78/100", label: "SUS usability score" },
              { value: "100%", label: "Would recommend" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-extrabold text-blue-700">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 mt-4">
            Pilot study · n=5 · University language lab · Tasks: translate a phrase, save to phrasebook, use sign bridge
          </p>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Start Connecting Today
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            No account required. Just open, translate, and start building cultural understanding.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/translate"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-blue-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 active:scale-95 transition-all shadow-lg"
            >
              🌐 Try Translation
            </Link>
            <Link
              href="/sign"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/10 text-white border-2 border-white/30 font-semibold px-8 py-3.5 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
            >
              👐 Explore Sign Language
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌉</span>
                <span className="font-bold text-white text-lg">TRADUMUST</span>
              </div>
              <p className="text-sm max-w-xs leading-relaxed">
                An educational translation and accessibility platform for inclusive campus communities.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
              <Link href="/translate" className="hover:text-white transition-colors">Translate</Link>
              <Link href="/sign" className="hover:text-white transition-colors">Sign Language</Link>
              <Link href="/phrasebook" className="hover:text-white transition-colors">Phrasebook</Link>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8">
            <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4 mb-6">
              <p className="text-amber-300 text-sm text-center leading-relaxed">
                ⚠️ <strong>Educational Disclaimer:</strong> TRADUMUST is an educational tool. Translations and sign language representations are provided for learning purposes only. For critical communications — medical, legal, or emergency situations — please consult a professional interpreter.
              </p>
            </div>
            <p className="text-center text-xs text-slate-500">
              © {new Date().getFullYear()} TRADUMUST · Built for exchange programs and inclusive education · Not for commercial use
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
