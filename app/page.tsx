"use client";

import Link from "next/link";
import {
  ArrowRight,
  HandMetal,
  GraduationCap,
  Globe2,
  Shield,
  Zap,
  Users,
  CheckCircle2,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

const FEATURES = [
  {
    icon: HandMetal,
    tag: "Studio",
    title: "Sign studio",
    desc: "Type text for the 3D avatar, or use your webcam to recognize signs — all in one place.",
    href: "/sign",
    cta: "Open studio",
  },
  {
    icon: GraduationCap,
    tag: "Learning",
    title: "Duolingo-style lessons",
    desc: "Interactive skill path with sounds, hearts, streaks, XP, and camera challenges — learn ASL, BSL, and LSF.",
    href: "/learn",
    cta: "Start learning",
  },
  {
    icon: Globe2,
    tag: "Languages",
    title: "ASL, BSL & LSF",
    desc: "Three major sign languages in one platform — switch courses anytime from the learn screen.",
    href: "/learn",
    cta: "Pick a language",
  },
];

const STATS = [
  { value: "3", label: "Sign languages", icon: Globe2 },
  { value: "50+", label: "Signs in model", icon: HandMetal },
  { value: "Real-time", label: "AI pipeline", icon: Zap },
  { value: "WCAG 2.2", label: "Accessibility target", icon: Shield },
];

const LANGUAGES = [
  { code: "ASL", name: "American Sign Language", region: "United States & Canada" },
  { code: "BSL", name: "British Sign Language", region: "United Kingdom" },
  { code: "LSF", name: "Langue des Signes Française", region: "France & Francophone regions" },
];

const STEPS = [
  { step: "01", title: "Select language", desc: "Choose ASL, BSL, or LSF for translation or learning." },
  { step: "02", title: "Translate or sign", desc: "Type text for the avatar, or use your webcam to sign." },
  { step: "03", title: "Communicate", desc: "Share output instantly — text, avatar animation, or saved history." },
];

const TESTIMONIALS = [
  {
    quote: "TRADUMUST lets me participate in class discussions without waiting for an interpreter every time.",
    name: "Sarah M.",
    role: "Deaf student, MUST University",
  },
  {
    quote: "The structured lessons and progress tracking fit how we teach ASL in our program.",
    name: "James K.",
    role: "ASL instructor",
  },
  {
    quote: "One platform covering ASL, BSL, and LSF is what inclusive institutions have been asking for.",
    name: "Marie L.",
    role: "Accessibility coordinator",
  },
];

const FAQ = [
  {
    q: "Which sign languages are supported?",
    a: "American Sign Language (ASL), British Sign Language (BSL), and French Sign Language (LSF). Additional languages are on the roadmap.",
  },
  {
    q: "Do I need an account?",
    a: "Guests can try the demo. Register to save history, track learning progress, and access the full curriculum.",
  },
  {
    q: "How does webcam recognition work?",
    a: "MediaPipe extracts hand and body landmarks. Our models classify signs and assemble grammatically corrected sentences.",
  },
  {
    q: "Is the platform accessible?",
    a: "Yes. We target WCAG 2.2 AA with keyboard navigation, screen reader support, visible focus states, dark mode, and semantic HTML.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen page-grid-bg">
      <MarketingNav />

      <main id="main-content">
        {/* Hero */}
        <section className="pt-28 pb-20 md:pt-36 md:pb-28">
          <Container>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <p className="overline text-[var(--brand-primary)] mb-4">
                  ASL · BSL · LSF
                </p>
                <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-semibold text-[var(--foreground)] leading-[1.15] tracking-tight">
                  Sign language communication for serious environments
                </h1>
                <p className="mt-6 text-lg text-[var(--text-secondary)] max-w-xl leading-relaxed">
                  TRADUMUST connects hearing and Deaf communities through AI translation,
                  real-time recognition, and structured learning — designed for universities,
                  healthcare, and public institutions.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Button href="/register" size="lg">
                    Create free account
                    <ArrowRight className="w-4 h-4" aria-hidden />
                  </Button>
                  <Button href="/sign" variant="secondary" size="lg">
                    <HandMetal className="w-4 h-4" aria-hidden />
                    Try demo
                  </Button>
                </div>
                <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--text-secondary)]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--brand-primary)]" aria-hidden />
                    No credit card required
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--brand-primary)]" aria-hidden />
                    Institutional deployment ready
                  </li>
                </ul>
              </div>

              <div className="surface-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-muted)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--border)]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--border)]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--border)]" />
                  <span className="mx-auto text-xs font-medium text-[var(--text-muted)]">
                    Live recognition preview
                  </span>
                </div>
                <div className="aspect-[4/3] bg-[var(--brand-secondary)] flex flex-col items-center justify-center p-8">
                  <div className="text-6xl mb-4" aria-hidden>🤟</div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-[var(--success)]" aria-hidden />
                    Detected: HELLO
                  </div>
                  <p className="mt-4 text-sm text-white/70 text-center max-w-xs">
                    Webcam input → landmark detection → sign classification → text output
                  </p>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Stats */}
        <section className="py-12 border-y border-[var(--border)] bg-[var(--surface)]" aria-label="Platform metrics">
          <Container>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map(({ value, label, icon: Icon }) => (
                <div key={label} className="text-center md:text-left">
                  <Icon className="w-5 h-5 text-[var(--brand-primary)] mx-auto md:mx-0 mb-2" aria-hidden />
                  <p className="text-2xl font-semibold text-[var(--foreground)]">{value}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">{label}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Features */}
        <section id="features" className="py-20 md:py-28">
          <Container>
            <SectionHeading
              overline="Capabilities"
              title="Three pillars of accessible communication"
              description="Translation, recognition, and education — integrated in one platform for daily use."
              className="mb-14"
            />
            <div className="grid md:grid-cols-3 gap-6">
              {FEATURES.map(({ icon: Icon, tag, title, desc, href, cta }) => (
                <Card key={title} padding="lg" className="flex flex-col">
                  <span className="overline text-[var(--text-muted)] mb-4">{tag}</span>
                  <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-[var(--brand-primary)]" aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">{title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">{desc}</p>
                  <Link
                    href={href}
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-primary)] hover:underline"
                  >
                    {cta}
                    <ArrowRight className="w-4 h-4" aria-hidden />
                  </Link>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-20 md:py-28 bg-[var(--surface-muted)] border-y border-[var(--border)]">
          <Container>
            <SectionHeading
              overline="Workflow"
              title="From input to communication in three steps"
              className="mb-14"
            />
            <div className="grid md:grid-cols-3 gap-6">
              {STEPS.map(({ step, title, desc }) => (
                <Card key={step} padding="lg">
                  <span className="text-sm font-semibold text-[var(--brand-primary)]">{step}</span>
                  <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* Languages */}
        <section id="languages" className="py-20 md:py-28">
          <Container>
            <SectionHeading
              overline="Languages"
              title="Multi-language sign support"
              description="Start with three major sign languages. Expand as your institution needs grow."
              className="mb-14"
            />
            <div className="grid md:grid-cols-3 gap-6">
              {LANGUAGES.map(({ code, name, region }) => (
                <Card key={code} padding="lg">
                  <p className="text-2xl font-semibold text-[var(--brand-secondary)]">{code}</p>
                  <h3 className="mt-2 font-semibold">{name}</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{region}</p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* Testimonials */}
        <section className="py-20 md:py-28 bg-[var(--surface)] border-y border-[var(--border)]">
          <Container>
            <SectionHeading overline="Testimonials" title="Trusted in education and accessibility" className="mb-14" />
            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map(({ quote, name, role }) => (
                <Card key={name} padding="lg">
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">&ldquo;{quote}&rdquo;</p>
                  <p className="mt-6 font-semibold text-sm">{name}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{role}</p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* Partners */}
        <section className="py-14 border-b border-[var(--border)]">
          <Container>
            <p className="overline text-center text-[var(--text-muted)] mb-8">Institutional partners</p>
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
              {["MUST University", "Deaf Alliance", "SignTech", "AccessForAll"].map((p) => (
                <span key={p} className="text-base font-medium text-[var(--text-secondary)]">{p}</span>
              ))}
            </div>
          </Container>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 md:py-28">
          <Container narrow>
            <SectionHeading overline="FAQ" title="Common questions" className="mb-12" />
            <div className="space-y-3">
              {FAQ.map(({ q, a }) => (
                <details key={q} className="surface-card group">
                  <summary className="px-6 py-4 font-medium cursor-pointer list-none flex justify-between items-center gap-4">
                    {q}
                    <span className="text-[var(--brand-primary)] text-xl leading-none group-open:rotate-45 transition-transform shrink-0" aria-hidden>+</span>
                  </summary>
                  <p className="px-6 pb-5 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)] pt-4">{a}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>

        {/* Contact + CTA */}
        <section id="contact" className="py-20 md:py-28 bg-[var(--brand-secondary)] text-white">
          <Container className="text-center max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Ready to deploy inclusive communication?
            </h2>
            <p className="mt-4 text-white/80 leading-relaxed">
              Start with a free account, or contact us for enterprise and institutional licensing.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button href="/register" size="lg" className="bg-white text-[var(--brand-secondary)] hover:bg-white/90 border-white">
                Get started free
              </Button>
              <a
                href="mailto:hello@tradumust.com"
                className="inline-flex h-12 items-center px-6 text-sm font-medium text-white border border-white/40 rounded-[var(--radius-md)] hover:bg-white/10 transition-colors"
              >
                hello@tradumust.com
              </a>
            </div>
            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-white/60">
              <Users className="w-4 h-4" aria-hidden />
              Join educators and accessibility teams using TRADUMUST
            </p>
          </Container>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
