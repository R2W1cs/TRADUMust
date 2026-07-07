"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw } from "lucide-react";
import { LearnLayout, LearnMascot } from "@/components/learn/LearnLayout";
import { Signer2D } from "@/components/Signer2D";
import { TslSignImage } from "@/components/TslSignImage";
import { SignPracticeWebcam } from "@/components/SignPracticeWebcam";
import type { SignLanguageCode } from "@/lib/sign-languages";
import { lessonsApi } from "@/lib/tradumust-api";
import { useProgressStats } from "@/lib/hooks/useProgress";
import { useLivesCountdown } from "@/lib/hooks/useLivesCountdown";
import { LIFE_REGEN_HOURS } from "@/lib/lives";
import { useLearnSounds } from "@/lib/learn-sounds";
import { getExercisePrompt, getShuffledOptions, getExerciseXpReward, computeLessonScore } from "@/lib/learn-exercise";
import { LEARN_WORLD_TAGLINE, LESSON_ENTER_LINES, pickAtmosphereLine } from "@/lib/learn-atmosphere";
import type { LessonExercise } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { updateProgress } from "@/lib/store/slices/learnSlice";

function Confetti() {
  const colors = ["#58CC02", "#FFC800", "#FF4B4B", "#1CB0F6", "#CE82FF"];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden>
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: colors[i % colors.length],
            animation: `confetti-fall ${1.5 + Math.random()}s ease-in forwards`,
            animationDelay: `${Math.random() * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}

function LessonContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const progressStats = useProgressStats();
  const regenCountdown = useLivesCountdown(progressStats.nextLifeRegenAt);
  const lives = useAppSelector((s) => s.learn.lives);
  const reducedMotion = useAppSelector((s) => s.ui.reducedMotion);
  const langCode = (params.lang as string)?.toUpperCase() ?? "ASL";
  const isTsl = langCode === "TSL";

  const lessonId = searchParams.get("lesson") ?? "";
  const [soundOn, setSoundOn] = useState(true);
  const sounds = useLearnSounds(soundOn && !reducedMotion);

  const { data, isLoading, error } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => lessonsApi.lesson(lessonId),
    enabled: !!lessonId,
  });

  const exercises = (data?.lesson?.exercises ?? []) as LessonExercise[];
  const lessonTitle = data?.lesson?.title ?? "Lesson";
  const lessonCategory = data?.lesson?.category ?? "";

  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [sessionXp, setSessionXp] = useState(0);
  const [watchReady, setWatchReady] = useState(false);
  const [watchKey, setWatchKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showOutOfHearts, setShowOutOfHearts] = useState(false);
  const [mascotMood, setMascotMood] = useState<"happy" | "think" | "celebrate" | "sad">("think");

  const exercise = exercises[current];
  const progressPct = exercises.length ? ((current + (feedback ? 1 : 0)) / exercises.length) * 100 : 0;

  const prompt = exercise
    ? getExercisePrompt(exercise, langCode, { lessonTitle, category: lessonCategory })
    : null;

  const options = useMemo(() => {
    if (!exercise) return [];
    return getShuffledOptions(exercise);
  }, [exercise?.id, current]);

  useEffect(() => {
    if (!progressStats.isLoading && lives <= 0 && !feedback) {
      setShowOutOfHearts(true);
    }
    if (lives > 0) setShowOutOfHearts(false);
  }, [progressStats.isLoading, lives, feedback]);

  useEffect(() => {
    if (exercises.length > 0) sounds.lessonStart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  useEffect(() => {
    setAnswer("");
    setFeedback(null);
    setWatchReady(false);
    setWatchKey((k) => k + 1);
    setMascotMood("think");
  }, [current, lessonId]);

  useEffect(() => {
    if (!exercise || exercise.type !== "WATCH_AVATAR") return;
    const timer = setTimeout(() => setWatchReady(true), 2000);
    return () => clearTimeout(timer);
  }, [exercise?.type, current, watchKey]);

  const canSubmit = useCallback(() => {
    if (!exercise || feedback) return false;
    switch (exercise.type) {
      case "WATCH_AVATAR": return watchReady;
      case "CAMERA_CHALLENGE": return false;
      default: return answer.trim().length > 0;
    }
  }, [exercise, feedback, watchReady, answer]);

  const submit = async () => {
    if (!exercise || !lessonId) return;
    sounds.tap();
    setSubmitting(true);
    try {
      if (exercise.type === "WATCH_AVATAR") {
        setFeedback("correct");
        setSessionXp((x) => x + getExerciseXpReward(exercise));
        setMascotMood("happy");
        sounds.correct();
        return;
      }
      const result = await lessonsApi.submitExercise(lessonId, exercise.id, answer) as {
        correct: boolean;
        lives?: number;
        nextLifeRegenAt?: string | null;
      };
      const correct = result.correct;
      setFeedback(correct ? "correct" : "wrong");
      if (correct) {
        setSessionXp((x) => x + getExerciseXpReward(exercise));
        setMascotMood("happy");
        sounds.correct();
      } else {
        if (typeof result.lives === "number") {
          dispatch(
            updateProgress({
              lives: result.lives,
              nextLifeRegenAt: result.nextLifeRegenAt ?? null,
            })
          );
        }
        queryClient.invalidateQueries({ queryKey: ["progress"] });
        setMascotMood("sad");
        sounds.wrong();
        sounds.heartLost();
      }
    } catch {
      const correct = answer.toLowerCase().trim() === exercise.correctAnswer.toLowerCase().trim();
      setFeedback(correct ? "correct" : "wrong");
      if (correct) { setSessionXp((x) => x + getExerciseXpReward(exercise)); setMascotMood("happy"); sounds.correct(); }
      else {
        dispatch(updateProgress({ lives: Math.max(0, lives - 1) }));
        setMascotMood("sad");
        sounds.wrong();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const next = async () => {
    sounds.tap();
    if (lives <= 0) {
      setShowOutOfHearts(true);
      return;
    }
    if (current < exercises.length - 1) {
      setCurrent((c) => c + 1);
      return;
    }
    if (lessonId) {
      try {
        await lessonsApi.complete(lessonId, computeLessonScore(sessionXp, exercises));
        queryClient.invalidateQueries({ queryKey: ["progress"] });
        queryClient.invalidateQueries({ queryKey: ["map"] });
      } catch { /* continue */ }
    }
    sounds.complete();
    setMascotMood("celebrate");
    setShowComplete(true);
  };

  const handleCameraValidated = () => {
    setFeedback("correct");
    if (exercise) setSessionXp((x) => x + getExerciseXpReward(exercise));
    setMascotMood("happy");
    sounds.correct();
  };

  const handleClose = () => router.push("/learn");

  if (!lessonId) {
    return (
      <LearnLayout lessonMode onClose={handleClose} progress={0}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <LearnMascot mood="think" message="No lesson selected. Head back to the course!" />
          <button type="button" onClick={handleClose} className="mt-8 learn-check-btn px-8 py-3 rounded-2xl">
            Back to course
          </button>
        </div>
      </LearnLayout>
    );
  }

  if (isLoading) {
    return (
      <LearnLayout lessonMode onClose={handleClose} progress={0}>
        <div className="flex justify-center py-32">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--learn-green)]" />
        </div>
      </LearnLayout>
    );
  }

  if (!progressStats.isLoading && showOutOfHearts) {
    return (
      <LearnLayout lessonMode onClose={handleClose} progress={0}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <LearnMascot
            mood="sad"
            message={
              regenCountdown
                ? `You're out of hearts. Your next heart returns in ${regenCountdown}.`
                : "You're out of hearts. They recharge every 5 hours."
            }
          />
          <p className="mt-4 text-sm text-[var(--learn-text-secondary)] max-w-sm">
            Hearts refill one at a time, every {LIFE_REGEN_HOURS} hours, up to {progressStats.maxLives}.
          </p>
          <button type="button" onClick={handleClose} className="mt-8 learn-check-btn px-8 py-3 rounded-2xl">
            Back to course
          </button>
        </div>
      </LearnLayout>
    );
  }

  if (error || !exercise || !prompt) {
    return (
      <LearnLayout lessonMode onClose={handleClose} progress={0}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <LearnMascot mood="sad" message="Couldn't load this lesson." />
          <button type="button" onClick={handleClose} className="mt-8 learn-check-btn px-8 py-3 rounded-2xl">
            Go back
          </button>
        </div>
      </LearnLayout>
    );
  }

  if (showComplete) {
    return (
      <LearnLayout lessonMode onClose={handleClose} progress={100}>
        {!reducedMotion && <Confetti />}
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center learn-pop">
          <LearnMascot mood="celebrate" message="Lesson complete! Great work!" size="lg" />
          <div className="mt-8 space-y-2">
            <p className="text-3xl font-extrabold text-[var(--learn-gold)]">+{sessionXp} XP</p>
            <p className="text-[var(--learn-text-secondary)] font-medium">{lessonTitle}</p>
          </div>
          <button
            type="button"
            onClick={() => { sounds.tap(); router.push("/learn"); }}
            className="mt-10 learn-check-btn px-10 py-4 rounded-2xl text-lg w-full max-w-xs"
          >
            Continue
          </button>
        </div>
      </LearnLayout>
    );
  }

  const signGloss = exercise.sign?.gloss || exercise.correctAnswer.toUpperCase().replace(/ /g, "_");
  const signWord = exercise.sign?.gloss || exercise.sign?.english || exercise.correctAnswer;
  const showSignPreview =
    prompt.showSign &&
    exercise.type !== "CAMERA_CHALLENGE";

  const isQuiz = exercise && ["MULTIPLE_CHOICE", "MATCH_SIGN", "FILL_BLANK"].includes(exercise.type);
  const atmosphereLine = pickAtmosphereLine(LESSON_ENTER_LINES, `${lessonId}-${current}`);

  return (
    <LearnLayout
      lessonMode
      progress={progressPct}
      onClose={handleClose}
      soundEnabled={soundOn}
      onToggleSound={() => setSoundOn((v) => !v)}
    >
      <div className="max-w-2xl mx-auto px-4 py-6 min-h-[calc(100vh-56px)] flex flex-col">
        <div className="learn-lesson-world-panel flex-1 flex flex-col p-5 lg:p-8 mb-4 learn-pop">
          <p className="learn-world-ribbon text-center mb-2">{LEARN_WORLD_TAGLINE}</p>
          {!feedback && !isQuiz && (
            <p className="text-center text-sm text-[var(--learn-gem)] font-medium mb-5 italic leading-relaxed">
              {atmosphereLine}
            </p>
          )}

        {/* Question header */}
        <div className="text-center mb-6">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--learn-text-muted)]">
              {langCode} · {current + 1}/{exercises.length}
            </span>
            {lessonCategory && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-[var(--learn-green)]/15 text-[var(--learn-green-dark)] border border-[var(--learn-green)]/30">
                {lessonCategory}
              </span>
            )}
            {prompt && !feedback && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-[var(--learn-surface-muted)] text-[var(--learn-text-secondary)] border border-[var(--learn-border)]">
                {prompt.typeLabel}
              </span>
            )}
          </div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-[var(--learn-text)] leading-snug max-w-lg mx-auto">
            {feedback
              ? mascotMood === "happy"
                ? "Correct!"
                : `Correct answer: ${exercise.correctAnswer}`
              : prompt?.title}
          </h1>
          {!feedback && prompt?.subtitle && (
            <p className="mt-2 text-sm font-medium text-[var(--learn-text-secondary)] max-w-md mx-auto leading-relaxed">
              {prompt.subtitle}
            </p>
          )}
        </div>

        {/* Sign preview — always visible for sign-language exercises */}
        {showSignPreview && exercise.type !== "WATCH_AVATAR" && (
          <div className="mb-6 learn-pop">
            <div className="h-52 lg:h-64 rounded-2xl overflow-hidden learn-sign-preview border-2 border-[var(--learn-border)] mx-auto max-w-md relative">
              {isTsl ? (
                <TslSignImage gloss={signGloss} alt={signWord} className="rounded-2xl" />
              ) : (
                <Signer2D
                  key={`${watchKey}-${current}`}
                  word={signWord.toUpperCase()}
                  showHint={prompt?.showHint ?? false}
                />
              )}
            </div>
            {prompt.signLabel && (
              <p className="text-center text-xs font-bold text-[var(--learn-gem)] mt-2 uppercase tracking-wide">
                {prompt.signLabel}
              </p>
            )}
          </div>
        )}

        <div className="flex-1 flex flex-col">
          {exercise.type === "WATCH_AVATAR" && (
            <div className="space-y-3 learn-pop mb-6">
              <div className="h-52 lg:h-64 rounded-2xl overflow-hidden learn-sign-preview border-2 border-[var(--learn-border)] mx-auto max-w-md relative">
                {isTsl ? (
                  <TslSignImage gloss={signGloss} alt={signWord} className="rounded-2xl" />
                ) : (
                  <Signer2D key={watchKey} word={signWord.toUpperCase()} showHint />
                )}
              </div>
              {prompt.signLabel && (
                <p className="text-center text-xs font-bold text-[var(--learn-gem)] uppercase tracking-wide">
                  {prompt.signLabel}
                </p>
              )}
              <div className="flex items-center justify-between max-w-md mx-auto">
                <p className="text-sm font-medium text-[var(--learn-text-secondary)]">
                  {watchReady ? "Ready to continue" : "Watch the full sign…"}
                </p>
                <button
                  type="button"
                  onClick={() => { setWatchKey((k) => k + 1); setWatchReady(false); sounds.tap(); }}
                  className="flex items-center gap-1 text-sm font-bold text-[var(--learn-gem)]"
                >
                  <RotateCcw className="w-4 h-4" /> Replay
                </button>
              </div>
              {!watchReady && (
                <div className="h-2 max-w-md mx-auto bg-[var(--learn-surface-muted)] rounded-full overflow-hidden border border-[var(--learn-border)]">
                  <div className="h-full bg-[var(--learn-gem)] rounded-full animate-[grow_2s_linear_forwards]" style={{ width: "0%" }} />
                </div>
              )}
            </div>
          )}

          {exercise.type === "CAMERA_CHALLENGE" && (
            <div className="h-56 lg:h-64 mb-6 rounded-2xl overflow-hidden border-2 border-[var(--learn-border)] learn-pop max-w-md mx-auto w-full">
              <SignPracticeWebcam
                targetSign={exercise.correctAnswer.toUpperCase()}
                signLanguage={langCode as SignLanguageCode}
                onValidated={handleCameraValidated}
              />
            </div>
          )}

          {(exercise.type === "MULTIPLE_CHOICE" || exercise.type === "MATCH_SIGN") && options.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {options.map((opt) => {
                const isSelected = answer === opt;
                const showResult = feedback !== null;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={!!feedback}
                    onClick={() => { sounds.tap(); setAnswer(opt); }}
                    className={cn(
                      "learn-option p-4 rounded-2xl text-center font-bold text-[var(--learn-text)] learn-pop min-h-[56px]",
                      isSelected && !showResult && "learn-option-selected",
                      showResult && isSelected && feedback === "correct" && "learn-option-correct",
                      showResult && isSelected && feedback === "wrong" && "learn-option-wrong",
                      showResult && !isSelected && opt === exercise.correctAnswer && feedback === "wrong" && "learn-option-correct"
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {exercise.type === "FILL_BLANK" && (
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit() && submit()}
              disabled={!!feedback}
              placeholder="Type the English meaning…"
              className="w-full max-w-md mx-auto block p-4 rounded-2xl border-2 border-[var(--learn-border)] bg-[var(--learn-surface)] text-[var(--learn-text)] font-bold mb-6 focus:outline-none focus:border-[var(--learn-green)] learn-pop"
            />
          )}
        </div>

        {/* Bottom action */}
        <div className="sticky bottom-0 pt-4 pb-2 -mx-1 px-1 mt-auto">
          {!feedback ? (
            exercise.type === "CAMERA_CHALLENGE" ? (
              <p className="text-center text-sm font-medium text-[var(--learn-text-secondary)] py-4">
                Perform the sign in front of your camera
              </p>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit() || submitting}
                className="learn-check-btn w-full max-w-md mx-auto block py-4 rounded-2xl text-base"
              >
                {submitting ? "Checking…" : exercise.type === "WATCH_AVATAR" ? "Continue" : "Check"}
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={next}
              className={cn(
                "w-full max-w-md mx-auto block py-4 rounded-2xl text-base font-extrabold uppercase tracking-wide border-2 transition-all active:translate-y-1 active:shadow-none",
                feedback === "correct"
                  ? "learn-check-btn"
                  : "bg-[var(--learn-heart)] border-[#EA2B2B] text-white shadow-[0_4px_0_#EA2B2B]"
              )}
            >
              {current < exercises.length - 1 ? "Continue" : "Finish lesson"}
            </button>
          )}
        </div>
        </div>
      </div>
    </LearnLayout>
  );
}

export default function LessonPage() {
  return (
    <Suspense fallback={
      <LearnLayout lessonMode onClose={() => {}} progress={0}>
        <div className="flex justify-center py-32">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--learn-green)]" />
        </div>
      </LearnLayout>
    }>
      <LessonContent />
    </Suspense>
  );
}
