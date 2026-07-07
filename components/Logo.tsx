"use client";

import { cn } from "@/lib/utils";

export function LogoIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-secondary)] shrink-0",
        className
      )}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="w-[58%] h-[58%]"
        aria-hidden="true"
      >
        <path d="M2 7H13" stroke="white" strokeWidth="1.9" strokeLinecap="round" />
        <path
          d="M10 4.5L13 7L10 9.5"
          stroke="white"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M18 13H7" stroke="white" strokeWidth="1.9" strokeLinecap="round" />
        <path
          d="M10 10.5L7 13L10 15.5"
          stroke="white"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

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
        <span className="font-normal text-[var(--text-secondary)]">Tradu</span>
        <span className="font-semibold">Must</span>
      </span>
    </div>
  );
}

export function LogoCompact({ className }: { className?: string }) {
  return (
    <Logo
      className={className}
      iconClass="w-7 h-7"
      textClass="text-sm font-medium"
    />
  );
}
