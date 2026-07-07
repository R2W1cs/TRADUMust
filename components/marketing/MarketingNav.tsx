"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Sun, Moon, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#languages", label: "Languages" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const { mode, toggleMode } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-shadow duration-200",
        scrolled
          ? "bg-[var(--nav-bg)] border-b border-[var(--border)] shadow-sm"
          : "bg-[var(--nav-bg)]/90 border-b border-transparent"
      )}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <Link href="/" aria-label="TRADUMUST home">
          <Logo iconClass="w-8 h-8" textClass="text-lg" />
        </Link>

        <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/sign"
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
          >
            Demo
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMode}
            className="p-2 rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {mode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            href="/login"
            className="hidden sm:inline text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)]"
          >
            Sign in
          </Link>
          <Button href="/register" size="sm" className="hidden sm:inline-flex">
            Get started
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Button>
        </div>
      </div>
    </header>
  );
}
