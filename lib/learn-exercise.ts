import type { LessonExercise } from "@/lib/api-types";

const LANG_NAMES: Record<string, string> = {
  ASL: "American Sign Language",
  BSL: "British Sign Language",
  LSF: "French Sign Language",
  TSL: "Tunisian Sign Language",
};

const EXERCISE_TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: "Choose the correct meaning",
  MATCH_SIGN: "Match sign to word",
  FILL_BLANK: "Type the answer",
  WATCH_AVATAR: "Learn this sign",
  CAMERA_CHALLENGE: "Sign it yourself",
};

const QUIZ_TYPES = new Set(["MULTIPLE_CHOICE", "MATCH_SIGN", "FILL_BLANK"]);

export function parseExerciseOptions(options: unknown): string[] {
  if (Array.isArray(options)) return options.filter((o): o is string => typeof o === "string");
  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function getShuffledOptions(exercise: LessonExercise): string[] {
  const parsed = parseExerciseOptions(exercise.options);
  const pool = parsed.length >= 2 ? parsed : [exercise.correctAnswer];
  const unique = Array.from(new Set(pool));
  const shuffled = shuffle(unique);
  if (shuffled.length <= 4) return shuffled;
  const correct = exercise.correctAnswer;
  const others = shuffled.filter((o) => o !== correct).slice(0, 3);
  return shuffle([correct, ...others]);
}

/** Quiz prompts must not reveal gloss, English answer, or movement hints */
export function getExercisePrompt(
  exercise: LessonExercise,
  lang: string,
  ctx?: { lessonTitle?: string; category?: string }
): {
  title: string;
  subtitle: string | null;
  signLabel: string | null;
  showSign: boolean;
  showHint: boolean;
  typeLabel: string;
} {
  const langName = LANG_NAMES[lang] ?? lang;
  const gloss = exercise.sign?.gloss?.toUpperCase().replace(/\s+/g, "_") ?? "";
  const signName = exercise.sign?.english ?? exercise.correctAnswer;
  const description =
    (exercise.sign as { description?: string } | null)?.description?.trim() ?? "";
  const typeLabel = EXERCISE_TYPE_LABEL[exercise.type] ?? "Practice";
  const isQuiz = QUIZ_TYPES.has(exercise.type);

  switch (exercise.type) {
    case "MULTIPLE_CHOICE":
    case "MATCH_SIGN":
      return {
        title: "What does this sign mean?",
        subtitle: "Watch the signer — pick the best English translation below.",
        signLabel: null,
        showSign: true,
        showHint: false,
        typeLabel,
      };
    case "FILL_BLANK":
      return {
        title: "Type the English meaning",
        subtitle: "Use a word or short phrase from this lesson.",
        signLabel: null,
        showSign: true,
        showHint: false,
        typeLabel,
      };
    case "WATCH_AVATAR":
      return {
        title: `Learn: ${signName}`,
        subtitle: description || `Watch the ${langName} sign carefully before you practice.`,
        signLabel: gloss ? `${lang} gloss: ${gloss.replace(/_/g, " ")}` : null,
        showSign: true,
        showHint: true,
        typeLabel,
      };
    case "CAMERA_CHALLENGE":
      return {
        title: `Sign it yourself`,
        subtitle: description
          ? `Perform the sign — ${description.charAt(0).toLowerCase()}${description.slice(1)}`
          : `Use your webcam and sign clearly in ${langName}.`,
        signLabel: null,
        showSign: false,
        showHint: false,
        typeLabel,
      };
    default:
      return {
        title: isQuiz ? "What does this sign mean?" : signName,
        subtitle: isQuiz ? null : ctx?.lessonTitle ?? langName,
        signLabel: isQuiz ? null : gloss ? gloss.replace(/_/g, " ") : null,
        showSign: true,
        showHint: !isQuiz,
        typeLabel,
      };
  }
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function shuffleOptions(options: string[]): string[] {
  return shuffle(options);
}

/** XP granted for one exercise (matches server seed defaults) */
export function getExerciseXpReward(exercise: Pick<LessonExercise, "type" | "xpReward">): number {
  if (typeof exercise.xpReward === "number") return exercise.xpReward;
  if (exercise.type === "CAMERA_CHALLENGE") return 15;
  return 10;
}

export function getMaxLessonXp(exercises: Pick<LessonExercise, "type" | "xpReward">[]): number {
  const total = exercises.reduce((sum, ex) => sum + getExerciseXpReward(ex), 0);
  return total > 0 ? total : 1;
}

/** Lesson completion score 0–100 for the API */
export function computeLessonScore(
  sessionXp: number,
  exercises: Pick<LessonExercise, "type" | "xpReward">[]
): number {
  const max = getMaxLessonXp(exercises);
  return Math.min(100, Math.max(0, Math.round((sessionXp / max) * 100)));
}
