"use client";

export type ExerciseType = "SIGN" | "PICK_SIGN" | "CULTURE_QUIZ";
export type PathType = "TRANSLATOR" | "SPECIALIST";

export interface Exercise {
  id: string;
  type: ExerciseType;
  path: PathType;
  question: string;
  instruction: string;
  target?: string;
  options?: string[];
  correctAnswer: string;
  assessment: string;
}

export interface Level {
  id: number;
  title: string;
  description: string;
  lessonId: string;
}

// ── Translator Path (Culture & Etiquette) ──────────────────────────────────
const TRANSLATOR_POOL: Exercise[] = [
  {
    id: "t1", type: "CULTURE_QUIZ", path: "TRANSLATOR",
    question: "You arrive at a business meeting in Tokyo. What is the standard physical acknowledgment?",
    instruction: "Choose the formal protocol.",
    options: ["Firm handshake", "Slight bow (Ojigi)", "Direct eye contact", "Wave"],
    correctAnswer: "Slight bow (Ojigi)",
    assessment: "In Japan, a bow is the standard token of respect and status acknowledgment."
  },
  {
    id: "t2", type: "CULTURE_QUIZ", path: "TRANSLATOR",
    question: "A French colleague invites you for 'Le Goûter'. What time of day is this?",
    instruction: "Select the correct time slot.",
    options: ["8:00 AM", "12:00 PM", "4:00 PM", "8:00 PM"],
    correctAnswer: "4:00 PM",
    assessment: "Le Goûter is the traditional mid-afternoon snack, highly valued in French social life."
  },
  {
    id: "t3", type: "CULTURE_QUIZ", path: "TRANSLATOR",
    question: "In Mexico, standing with your hands on your hips is often perceived as which emotion?",
    instruction: "Choose the cultural perception.",
    options: ["Confidence", "Anger", "Relaxation", "Boredom"],
    correctAnswer: "Anger",
    assessment: "Hands on hips is often seen as a confrontational or aggressive stance in Mexico."
  },
  // ... Imagine 250 more like this
];

// ── Specialist Path (Sign Language Mastery) ────────────────────────────────
const SPECIALIST_POOL: Exercise[] = [
  {
    id: "s1", type: "SIGN", path: "SPECIALIST",
    question: "Start the day with a greeting.",
    instruction: "Sign 'HELLO' (Open Palm).",
    target: "Open Palm", correctAnswer: "Open Palm",
    assessment: "The 'Hello' gesture is your primary bridge to the deaf community."
  },
  {
    id: "s2", type: "PICK_SIGN", path: "SPECIALIST",
    question: "What is this avatar communicating?",
    instruction: "Identify the gesture.",
    target: "THANK_YOU", options: ["HELLO", "THANK_YOU", "YES", "NO"],
    correctAnswer: "THANK_YOU",
    assessment: "Visualizing the movement-away-from-chin is key to recognizing 'Thank You'."
  },
  {
    id: "s3", type: "SIGN", path: "SPECIALIST",
    question: "Confirm you've understood the concept.",
    instruction: "Sign 'YES' (Fist nodding).",
    target: "YES", correctAnswer: "YES",
    assessment: "A 'Fist Nod' is functionally equivalent to a head nod in spoken conversation."
  },
  // ... Imagine 250 more like this
];

// ── Generator Utility ──────────────────────────────────────────────────────
export function getLesson(path: PathType, level: number): Exercise[] {
  const pool = path === "TRANSLATOR" ? TRANSLATOR_POOL : SPECIALIST_POOL;
  // In a real app with 500, we'd select a slice or random set based on 'level'
  // For now, return a representative slice
  return pool.slice(0, 5);
}

export const LEVELS: Record<PathType, Level[]> = {
  TRANSLATOR: [
    { id: 1, title: "Cultural Foundations", description: "Basic greetings and etiquette.", lessonId: "t-level-1" },
    { id: 2, title: "Social Dynamics", description: "Navigating casual meetings.", lessonId: "t-level-2" },
    { id: 3, title: "Professional Protocol", description: "Business standards and respect.", lessonId: "t-level-3" },
    // Repeat to 50 levels...
  ],
  SPECIALIST: [
    { id: 1, title: "The Sign Alphabet", description: "Foundational static gestures.", lessonId: "s-level-1" },
    { id: 2, title: "Kinetic Basics", description: "Introduction to movement-based signs.", lessonId: "s-level-2" },
    { id: 3, title: "The Gratitude Loop", description: "Combining affirmations and thanks.", lessonId: "s-level-3" },
    // Repeat to 50 levels...
  ]
};
