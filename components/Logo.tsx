"use client";

import { cn } from "@/lib/utils";

/**
 * Standalone icon tile — two opposing arrows = bidirectional translation.
 * Pass `className` to control the tile's width/height (default: w-9 h-9).
 */
export function LogoIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-purple-500/20 shrink-0",
        className
      )}
    >
      {/* 20×20 grid: two arrows on y=7 (→) and y=13 (←) */}
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="w-[58%] h-[58%]"
        aria-hidden="true"
      >
        {/* Top arrow — pointing right */}
        <path d="M2 7H13"           stroke="white" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M10 4.5L13 7L10 9.5" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        {/* Bottom arrow — pointing left */}
        <path d="M18 13H7"           stroke="white" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M10 10.5L7 13L10 15.5" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/**
 * Full logo: icon + wordmark.
 * `iconClass` overrides the icon tile size (default: w-9 h-9).
 * `textClass` overrides the wordmark typography.
 */
export function Logo({
  className,
  iconClass,
  textClass,
}: {
  className?: string;
  iconClass?: string;
  textClass?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoIcon className={cn("w-9 h-9", iconClass)} />
      <span className={cn("text-[var(--foreground)] tracking-tight select-none", textClass)}>
        <span className="font-light">Tradu</span>
        <span className="font-bold">Must</span>
      </span>
    </div>
  );
}

/**
 * Compact variant for inner-page back links.
 * Renders a small icon tile + wordmark at a reduced scale.
 */
export function LogoCompact({ className }: { className?: string }) {
  return (
    <Logo
      className={className}
      iconClass="w-6 h-6 rounded-lg"
      textClass="text-sm font-medium"
    />
  );
}
