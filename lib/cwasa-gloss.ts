import { textToAvatarSequence } from "@/lib/text-to-avatar-sequence";
import type { CwasaLibrary, CwasaLibraryId } from "@/lib/cwasa-libraries";
import { getCwasaLibrary } from "@/lib/cwasa-libraries";

export interface GlossIndex {
  version: number;
  builtAt: string;
  libraries: Record<
    CwasaLibraryId,
    {
      glossCount: number;
      glosses: string[];
      /** lowercase english token → gloss filename (ASL only) */
      englishToGloss?: Record<string, string>;
    }
  >;
}

let cachedIndex: GlossIndex | null = null;

function isGlossIndex(data: unknown): data is GlossIndex {
  if (!data || typeof data !== "object") return false;
  const d = data as GlossIndex;
  return d.version >= 2 && typeof d.libraries === "object" && d.libraries !== null;
}

export async function loadGlossIndex(): Promise<GlossIndex> {
  if (cachedIndex) return cachedIndex;
  const res = await fetch(`/asl-avatar/gloss-index.json?v=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Gloss index missing — run npm run cwasa:gloss");
  const data: unknown = await res.json();
  if (!isGlossIndex(data)) {
    throw new Error("Gloss index is outdated — run npm run cwasa:gloss and hard-refresh");
  }
  cachedIndex = data;
  return cachedIndex;
}

function glossSet(index: GlossIndex, libraryId: CwasaLibraryId) {
  return new Set(index.libraries?.[libraryId]?.glosses ?? []);
}

function greedyArabic(tokens: string[], valid: Set<string>): string[] {
  const glosses: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    for (let len = Math.min(4, tokens.length - i); len >= 1; len--) {
      const phrase = tokens.slice(i, i + len).join(" ");
      if (valid.has(phrase)) {
        glosses.push(phrase);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) i += 1;
  }
  return glosses;
}

function resolveAslEnglish(text: string, index: GlossIndex): string[] {
  const lib = index.libraries?.ASL;
  const valid = glossSet(index, "ASL");
  const map = lib?.englishToGloss ?? {};
  const tokens = text.trim().split(/\s+/).filter(Boolean);

  const fromMap: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    for (let len = Math.min(3, tokens.length - i); len >= 1; len--) {
      const phrase = tokens.slice(i, i + len).join(" ").toLowerCase();
      const gloss = map[phrase];
      if (gloss && valid.has(gloss)) {
        fromMap.push(gloss);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) i += 1;
  }
  if (fromMap.length) return fromMap;

  const units = textToAvatarSequence(text);
  const glosses: string[] = [];
  for (const unit of units) {
    const key = unit.word.replace(/_/g, " ").toLowerCase();
    const gloss = map[key] ?? map[unit.word.toLowerCase()] ?? unit.word;
    if (valid.has(gloss)) glosses.push(gloss);
    else if (unit.tag === "LETTER" && valid.has(unit.word)) glosses.push(unit.word);
  }
  return glosses;
}

export function resolveNativeGlosses(
  text: string,
  libraryId: CwasaLibraryId,
  index: GlossIndex
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const valid = glossSet(index, libraryId);

  if (libraryId === "ALSL") {
    return greedyArabic(trimmed.split(/\s+/).filter(Boolean), valid);
  }

  if (libraryId === "ASL") {
    return resolveAslEnglish(trimmed, index);
  }

  return [];
}

export function libraryForLanguage(libraryId: CwasaLibraryId): CwasaLibrary {
  return getCwasaLibrary(libraryId);
}
