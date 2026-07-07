"use client";

import Link from "next/link";
import { Lock, Star, Check, Crown, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { playTap } from "@/lib/learn-sounds";
import type { MapUnit } from "@/lib/api-types";

interface SkillPathProps {
  units: MapUnit[];
  language: string;
}

type NodeState = "locked" | "available" | "completed" | "current";

function getLessonState(
  lesson: MapUnit["lessons"][0],
  globalIndex: number,
  firstIncompleteIndex: number
): NodeState {
  if (lesson.progress?.[0]?.completed) return "completed";
  if (globalIndex === firstIncompleteIndex) return "current";
  if (globalIndex < firstIncompleteIndex) return "available";
  return "locked";
}

export function SkillPath({ units, language }: SkillPathProps) {
  let lessonIndex = 0;
  let firstIncomplete = -1;

  const allLessons = units.flatMap((unit) =>
    unit.lessons.map((lesson) => {
      const idx = lessonIndex++;
      const done = lesson.progress?.[0]?.completed;
      if (!done && firstIncomplete === -1) firstIncomplete = idx;
      return { ...lesson, unitTitle: unit.title, unitOrder: unit.orderIndex, globalIndex: idx };
    })
  );

  if (firstIncomplete === -1) firstIncomplete = allLessons.length;

  return (
    <div className="max-w-md lg:max-w-xl mx-auto px-4 py-6 space-y-8 pb-12">
      {units.map((unit, unitIdx) => {
        const unitLessons = allLessons.filter((l) => l.unitOrder === unit.orderIndex);
        const unitCompleted = unitLessons.filter((l) => l.progress?.[0]?.completed).length;
        const unitTotal = unitLessons.length;

        return (
          <section key={unit.id}>
            {/* Unit banner — static (sticky caused header jump on scroll) */}
              <div className="mb-6">
              <div className="learn-unit-banner rounded-xl px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-90">Unit {unit.orderIndex}</p>
                    <h2 className="text-lg font-extrabold">{unit.title}</h2>
                  </div>
                  <div className="text-right text-sm font-bold">
                    {unitCompleted}/{unitTotal}
                  </div>
                </div>
                <div className="mt-2 h-2 bg-black/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/90 rounded-full transition-all"
                    style={{ width: unitTotal ? `${(unitCompleted / unitTotal) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            </div>

            {/* Zigzag path */}
            <div className="relative flex flex-col items-center gap-4">
              {unitLessons.map((lesson, i) => {
                const state = getLessonState(lesson, lesson.globalIndex, firstIncomplete);
                const offset = i % 2 === 0 ? "-translate-x-8" : "translate-x-8";
                const isLocked = state === "locked";

                const href = isLocked
                  ? "#"
                  : `/learn/${language.toLowerCase()}/lesson?lesson=${lesson.id}`;

                const icons: Record<NodeState, React.ReactNode> = {
                  locked: <Lock className="w-6 h-6" />,
                  available: <Star className="w-6 h-6" />,
                  completed: <Check className="w-7 h-7 stroke-[3]" />,
                  current: <Star className="w-7 h-7 fill-current" />,
                };

                const node = (
                  <div className={cn("relative flex flex-col items-center", offset)}>
                    {/* Connector line */}
                    {i > 0 && (
                      <div
                        className="absolute -top-4 w-1 h-4 bg-[var(--learn-green)]/40 rounded-full"
                        aria-hidden
                      />
                    )}

                    {isLocked ? (
                      <div
                        className="w-[68px] h-[68px] rounded-full bg-white border-2 border-[var(--learn-border)] flex items-center justify-center text-[var(--learn-text-muted)] shadow-sm dark:bg-[var(--learn-surface-muted)] dark:border-4"
                        title="Complete previous lessons first"
                      >
                        {icons.locked}
                      </div>
                    ) : (
                      <Link
                        href={href}
                        onClick={() => playTap()}
                        className={cn(
                          "w-[68px] h-[68px] rounded-full flex items-center justify-center font-bold transition-transform active:translate-y-1 active:shadow-none",
                          state === "completed" &&
                            "bg-[var(--learn-gold)] border-[3px] border-[var(--learn-gold-dark)] text-white shadow-md",
                          state === "current" &&
                            "bg-[var(--learn-gem)] border-[3px] border-[var(--learn-green-dark)] text-white shadow-lg ring-4 ring-[var(--learn-green)]/15",
                          state === "available" &&
                            "bg-[var(--learn-green)] border-[3px] border-[var(--learn-green-dark)] text-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        )}
                        aria-label={`${lesson.title}${state === "completed" ? " — completed" : ""}`}
                      >
                        {icons[state]}
                      </Link>
                    )}

                    <p className={cn(
                      "mt-2 text-xs font-bold text-center max-w-[120px] leading-tight",
                      isLocked ? "text-[var(--learn-text-muted)]" : "text-[var(--learn-text)]"
                    )}>
                      {lesson.title}
                    </p>
                  </div>
                );

                return <div key={lesson.id}>{node}</div>;
              })}

              {/* Unit trophy at end */}
              {unitIdx < units.length - 1 && (
                <div className="mt-2 opacity-40">
                  <div className="w-14 h-14 rounded-full bg-[var(--learn-surface-muted)] border-4 border-[var(--learn-border)] flex items-center justify-center">
                    <Crown className="w-6 h-6 text-[var(--learn-text-muted)]" />
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* Practice hub */}
      <div className="pb-8">
        <div className="learn-card-surface rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[var(--learn-purple)] border-4 border-[var(--learn-purple-dark)] flex items-center justify-center shadow-[0_4px_0_var(--learn-purple-shadow)]">
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-[var(--learn-text)]">Daily practice</h3>
            <p className="text-sm text-[var(--learn-text-secondary)]">Review signs you&apos;ve learned</p>
          </div>
          <Link
            href={`/learn/${language.toLowerCase()}/lesson?lesson=${allLessons.find((l) => l.progress?.[0]?.completed)?.id ?? allLessons[0]?.id}`}
            onClick={() => playTap()}
            className="px-4 py-2 bg-[var(--learn-purple)] text-white font-bold rounded-xl border-2 border-[var(--learn-purple-dark)] shadow-[0_3px_0_var(--learn-purple-shadow)] active:translate-y-0.5 active:shadow-none text-sm"
          >
            START
          </Link>
        </div>
      </div>
    </div>
  );
}
