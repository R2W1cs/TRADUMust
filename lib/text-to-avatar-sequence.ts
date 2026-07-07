import type { WordMeta } from "@/components/VisualGlossBoard";

/** Words with dedicated Signer2D sign animations */
export const KNOWN_SIGN_WORDS = new Set([
  "HELLO", "HI", "GOODBYE", "THANK_YOU", "PLEASE", "SORRY", "YES", "NO",
  "WHERE", "WHAT", "WHO", "WHEN", "WHY", "HOW", "HELP", "UNDERSTAND", "KNOW",
  "WANT", "LOVE", "GO", "COME", "SEE", "GOOD", "BAD", "WAIT", "NAME", "NEED",
  "LEARN", "YOU", "ME", "ARE", "FINE", "WELL", "MORNING", "NIGHT",
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
]);

/** No single ASL sign — always fingerspell letter by letter */
const FINGERSPELL_ONLY = new Set(["SIR", "MAAM", "MADAM"]);

const PHRASE_GLOSSES: { pattern: RegExp; gloss: string[] }[] = [
  { pattern: /^good morning\b/i, gloss: ["GOOD", "MORNING"] },
  { pattern: /^good night\b/i, gloss: ["GOOD", "NIGHT"] },
  { pattern: /^thank you\b/i, gloss: ["THANK_YOU"] },
  { pattern: /^nice to meet you\b/i, gloss: ["HELLO", "GOOD", "YOU"] },
  { pattern: /^how are you\b/i, gloss: ["HOW", "YOU"] },
  { pattern: /^i love you\b/i, gloss: ["ME", "LOVE", "YOU"] },
];

const WORD_ALIASES: Record<string, string> = {
  HELLO: "HELLO",
  HI: "HI",
  HOW: "HOW",
  YOU: "YOU",
  YOUR: "YOU",
  ARE: "ARE",
  AM: "ARE",
  IS: "ARE",
  SIR: "SIR",
  MAAM: "MAAM",
  MADAM: "MADAM",
  FINE: "FINE",
  GOOD: "GOOD",
  WELL: "WELL",
  OK: "GOOD",
  OKAY: "GOOD",
  YES: "YES",
  NO: "NO",
  PLEASE: "PLEASE",
  SORRY: "SORRY",
  THANKS: "THANK_YOU",
  HELP: "HELP",
  NAME: "NAME",
  LEARN: "LEARN",
  LOVE: "LOVE",
  ME: "ME",
  I: "ME",
  MY: "ME",
  MORNING: "MORNING",
  NIGHT: "NIGHT",
  MEET: "HELLO",
  NICE: "GOOD",
};

function fingerspellWord(word: string): WordMeta[] {
  const letters =
    word === "MAAM" || word === "MADAM" ? ["M", "A", "M"] : word.split("");
  return letters.map((ch) => ({
    word: ch,
    tag: "LETTER",
    duration_ms: 900,
  }));
}

function expandWord(word: string): WordMeta[] {
  const key = WORD_ALIASES[word] ?? word;

  if (FINGERSPELL_ONLY.has(key)) {
    return fingerspellWord(key);
  }

  if (KNOWN_SIGN_WORDS.has(key)) {
    return [{
      word: key,
      tag: key.length === 1 ? "LETTER" : "SIGN",
      duration_ms: key.length === 1 ? 900 : 1200,
    }];
  }

  return fingerspellWord(key);
}

/** Convert English text → ordered avatar sign units (ASL-oriented gloss + fingerspell fallback) */
export function textToAvatarSequence(text: string): WordMeta[] {
  const tokens = text.trim().replace(/[^\w\s']/g, " ").split(/\s+/).filter(Boolean);
  const units: WordMeta[] = [];
  let idx = 0;

  while (idx < tokens.length) {
    const tail = tokens.slice(idx).join(" ");
    let matchedPhrase = false;

    for (const { pattern, gloss } of PHRASE_GLOSSES) {
      const m = pattern.exec(tail);
      if (m && m.index === 0) {
        const wordCount = m[0].trim().split(/\s+/).length;
        for (const g of gloss) {
          units.push(...expandWord(g));
        }
        idx += wordCount;
        matchedPhrase = true;
        break;
      }
    }

    if (matchedPhrase) continue;

    const word = tokens[idx].toUpperCase();
    if (word === "ARE" && units.some((u) => u.word === "HOW")) {
      idx += 1;
      continue;
    }
    units.push(...expandWord(word));
    idx += 1;
  }

  return units;
}
