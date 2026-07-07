/** Immersive copy — community & visual language, not gamified fluff */

export const LEARN_WORLD_TAGLINE = "Visual Language Studio";

export const MAP_WELCOME_LINES = [
  "Step into a space built for eyes, hands, and connection.",
  "Real signs. Real conversations. Your path into the community.",
  "Learn the language that lives in movement — not sound.",
];

export const LESSON_ENTER_LINES = [
  "Focus on the hands. Facial expression carries meaning too.",
  "You're in the signing studio — watch, then answer.",
  "Every sign you learn is a bridge to someone new.",
  "Visual language is how deaf communities connect worldwide.",
  "Take your time. Clarity beats speed.",
];

export function pickAtmosphereLine(lines: string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % lines.length;
  return lines[hash] ?? lines[0];
}
