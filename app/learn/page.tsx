"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { LearnLayout, LearnMascot } from "@/components/learn/LearnLayout";
import { SkillPath } from "@/components/learn/SkillPath";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { setLanguage } from "@/lib/store/slices/learnSlice";
import { lessonsApi, progressApi } from "@/lib/tradumust-api";
import type { MapUnit } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { playTap } from "@/lib/learn-sounds";
import { LEARN_WORLD_TAGLINE, MAP_WELCOME_LINES, pickAtmosphereLine } from "@/lib/learn-atmosphere";

import { SIGN_LANGUAGE_META, SIGN_LANGUAGE_CODES, type SignLanguageCode } from "@/lib/sign-languages";

export default function LearnPage() {
  const dispatch = useAppDispatch();
  const { currentLanguage } = useAppSelector((s) => s.learn);
  const token = useAppSelector((s) => s.auth.token);

  const { data: langData } = useQuery({
    queryKey: ["languages"],
    queryFn: lessonsApi.languages,
  });

  const { data: mapData, isLoading: mapLoading } = useQuery({
    queryKey: ["map", currentLanguage],
    queryFn: () => progressApi.map(currentLanguage),
    enabled: !!token,
  });

  const { data: unitsData, isLoading: unitsLoading } = useQuery({
    queryKey: ["units", currentLanguage],
    queryFn: () => lessonsApi.units(currentLanguage),
    enabled: !token,
  });

  const languages = (langData?.languages as Array<{ code: string }>) ?? SIGN_LANGUAGE_CODES.map((code) => ({ code }));

  const units: MapUnit[] = token
    ? (mapData?.units ?? [])
    : ((unitsData?.units ?? []).map((u) => ({
        ...u,
        lessons: u.lessons.map((l) => ({ ...l, progress: [] })),
      })) as MapUnit[]);

  const loading = token ? mapLoading : unitsLoading;
  const meta = SIGN_LANGUAGE_META[currentLanguage as SignLanguageCode] ?? SIGN_LANGUAGE_META.ASL;

  const languageBar = (
    <div className="flex gap-2 w-full max-w-xl">
      {languages.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => {
            playTap();
            dispatch(setLanguage(lang.code as SignLanguageCode));
          }}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all",
            currentLanguage === lang.code
              ? "learn-lang-active"
              : "learn-card-surface text-[var(--learn-text)] hover:border-[var(--learn-green)]"
          )}
        >
          {SIGN_LANGUAGE_META[lang.code as SignLanguageCode]?.flag ?? "🤟"} {lang.code}
        </button>
      ))}
    </div>
  );

  return (
    <LearnLayout languageBar={languageBar}>
      <div className="max-w-2xl mx-auto px-4 lg:px-8 pb-12">
        <div className="learn-map-hero mt-4 mb-8 text-center">
          <p className="learn-world-ribbon mb-4">{LEARN_WORLD_TAGLINE}</p>
          <LearnMascot
            mood="happy"
            message={pickAtmosphereLine(MAP_WELCOME_LINES, currentLanguage)}
          />
          <h1 className="mt-8 text-3xl lg:text-4xl font-bold text-[var(--learn-text)] tracking-tight">
            {meta?.flag} {meta?.name ?? currentLanguage}
          </h1>
          <p className="text-base text-[var(--learn-text-secondary)] mt-3 max-w-md mx-auto leading-relaxed">
            {units.reduce((n, u) => n + u.lessons.length, 0)} lessons on the path — each one a step into deaf community culture.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-12 h-12 animate-spin text-[var(--learn-green)]" aria-label="Loading" />
          </div>
        ) : units.length === 0 ? (
          <p className="text-center py-24 text-[var(--learn-text-secondary)] font-semibold text-lg">
            No lessons yet. Ask an admin to seed the course.
          </p>
        ) : (
          <SkillPath units={units} language={currentLanguage} />
        )}
      </div>
    </LearnLayout>
  );
}
