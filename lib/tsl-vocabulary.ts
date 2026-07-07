import vocabulary from "@/data/tsl/vocabulary.json";

export interface TslSignEntry {
  id: string;
  gloss: string;
  english: string;
  arabic: string;
  category: string;
  description: string;
}

export interface TslVocabulary {
  meta: { name: string; code: string; source: string; categories: string[] };
  signs: TslSignEntry[];
}

export const TSL_VOCABULARY = vocabulary as TslVocabulary;
export const TSL_SIGN_COUNT = TSL_VOCABULARY.signs.length;

const englishToGloss = new Map<string, string>();
const arabicToGloss = new Map<string, string>();
const glossToEntry = new Map<string, TslSignEntry>();

for (const sign of TSL_VOCABULARY.signs) {
  glossToEntry.set(sign.gloss.toUpperCase(), sign);
  englishToGloss.set(sign.english.trim().toLowerCase(), sign.gloss);
  arabicToGloss.set(sign.arabic.trim(), sign.gloss);
  englishToGloss.set(sign.gloss.toLowerCase(), sign.gloss);
  englishToGloss.set(sign.id.toLowerCase(), sign.gloss);
}

/** Common English aliases → TSL gloss */
const ALIASES: Record<string, string> = {
  hello: "3ASLEMA",
  hi: "3ASLEMA",
  welcome: "MAR7BA",
  yes: "OUI",
  no: "NON",
  mom: "OM",
  mother: "OM",
  dad: "BOU",
  father: "BOU",
  home: "DAR",
  house: "DAR",
  car: "KARHBA",
  bus: "CAR",
  hospital: "SBITAR",
  today: "LYOUM",
  family: "3AYLA",
};

function lookupPhrase(phrase: string): string | null {
  const key = phrase.trim().toLowerCase();
  if (!key) return null;
  const alias = ALIASES[key];
  if (alias) return alias;
  const fromEnglish = englishToGloss.get(key);
  if (fromEnglish) return fromEnglish;
  const upper = key.toUpperCase().replace(/ /g, "_");
  if (glossToEntry.has(upper)) return upper;
  return null;
}

function lookupArabicPhrase(phrase: string): string | null {
  const trimmed = phrase.trim();
  if (!trimmed) return null;
  return arabicToGloss.get(trimmed) ?? null;
}

/** Resolve input text to ordered TSL glosses using the photo dataset. */
export function resolveTslGlosses(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const hasArabic = /[\u0600-\u06FF]/.test(trimmed);
  const glosses: string[] = [];

  if (hasArabic) {
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < tokens.length) {
      let matched = false;
      for (let len = Math.min(3, tokens.length - i); len >= 1; len--) {
        const phrase = tokens.slice(i, i + len).join(" ");
        const gloss = lookupArabicPhrase(phrase);
        if (gloss) {
          glosses.push(gloss);
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) i += 1;
    }
    if (glosses.length) return glosses;
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    for (let len = Math.min(4, tokens.length - i); len >= 1; len--) {
      const phrase = tokens.slice(i, i + len).join(" ");
      const gloss = lookupPhrase(phrase);
      if (gloss) {
        glosses.push(gloss);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) i += 1;
  }

  return glosses;
}

export function getTslSign(gloss: string): TslSignEntry | undefined {
  return glossToEntry.get(gloss.toUpperCase());
}

export const TSL_EXPRESS_META = {
  label: "TSL",
  flag: "🇹🇳",
  placeholder: "English or Arabic — e.g. hello mother bank اليوم",
  defaultText: "hello mother",
  hint: `Tunisian Sign Language — ${TSL_SIGN_COUNT} authentic reference photos from the TSL dataset`,
};
