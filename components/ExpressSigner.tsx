"use client";

import { useState } from "react";
import { AslAvatar3D } from "@/components/AslAvatar3D";
import { TslExpressSigner } from "@/components/TslExpressSigner";
import {
  CWASA_COMING_SOON,
  CWASA_LIBRARY_LIST,
  getCwasaLibrary,
  type CwasaLibraryId,
} from "@/lib/cwasa-libraries";
import { TSL_EXPRESS_META } from "@/lib/tsl-vocabulary";
import { cn } from "@/lib/utils";

export type ExpressLanguage = CwasaLibraryId | "TSL";

interface ExpressSignerProps {
  defaultLanguage?: ExpressLanguage;
  minHeight?: number;
}

export function ExpressSigner({ defaultLanguage = "ASL", minHeight = 480 }: ExpressSignerProps) {
  const [language, setLanguage] = useState<ExpressLanguage>(defaultLanguage);

  const isTsl = language === "TSL";
  const cwasaLib = !isTsl ? getCwasaLibrary(language) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose sign language">
        {CWASA_LIBRARY_LIST.map((opt) => {
          const active = language === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setLanguage(opt.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                active
                  ? "border-indigo-500 bg-indigo-500/15 text-indigo-400"
                  : "border-[var(--panel-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
              )}
            >
              <span aria-hidden>{opt.flag}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={isTsl}
          onClick={() => setLanguage("TSL")}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
            isTsl
              ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
              : "border-[var(--panel-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
          )}
        >
          <span aria-hidden>{TSL_EXPRESS_META.flag}</span>
          <span>{TSL_EXPRESS_META.label}</span>
          <span className="text-[10px] font-normal uppercase tracking-wide text-emerald-500/80">
            Photos
          </span>
        </button>
        {CWASA_COMING_SOON.filter((opt) => opt.code !== "TSL").map((opt) => (
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

      {isTsl ? (
        <TslExpressSigner defaultText={TSL_EXPRESS_META.defaultText} minHeight={minHeight} />
      ) : (
        <AslAvatar3D
          key={language}
          defaultLanguage={language}
          defaultText={cwasaLib!.defaultText}
          minHeight={minHeight}
          showControls
          showAvatarPicker
          showLanguagePicker={false}
        />
      )}
    </div>
  );
}
