"use client";

import Image from "next/image";
import { useState } from "react";
import { HandMetal } from "lucide-react";
import { cn } from "@/lib/utils";

interface TslSignImageProps {
  gloss: string;
  alt?: string;
  className?: string;
}

/** Reference photo from the Tunisian Sign Language dataset. */
export function TslSignImage({ gloss, alt, className }: TslSignImageProps) {
  const key = gloss.toLowerCase();
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-[var(--learn-surface-muted)] text-[var(--learn-text-muted)]",
          className
        )}
      >
        <HandMetal className="w-12 h-12 mb-2 opacity-50" />
        <span className="text-xs font-bold uppercase tracking-wide">{gloss.replace(/_/g, " ")}</span>
      </div>
    );
  }

  return (
    <Image
      src={`/tsl/signs/${key}.jpg`}
      alt={alt ?? `Tunisian sign: ${gloss}`}
      fill
      className={cn("object-contain bg-black/5", className)}
      sizes="(max-width: 768px) 100vw, 400px"
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}
