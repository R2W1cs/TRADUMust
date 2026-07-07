import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

export type TslSignDef = {
  gloss: string;
  english: string;
  description: string;
  imageKey: string;
};

export type TslLessonPlan = {
  title: string;
  description: string;
  category: string;
  signs: TslSignDef[];
};

export type TslUnitPlan = {
  title: string;
  description: string;
  orderIndex: number;
  lessons: TslLessonPlan[];
};

type VocabSign = {
  id: string;
  gloss: string;
  english: string;
  arabic: string;
  category: string;
  description: string;
};

const __dir = dirname(fileURLToPath(import.meta.url));
const vocabPath = join(__dir, "../../data/tsl/vocabulary.json");
const vocab = JSON.parse(readFileSync(vocabPath, "utf8")) as {
  signs: VocabSign[];
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const CATEGORY_META: Record<string, { title: string; description: string }> = {
  Demandes: {
    title: "Unit 1 — Greetings & requests",
    description: "Everyday Tunisian signs for hello, politeness, and common questions",
  },
  Famille: {
    title: "Unit 2 — Family",
    description: "Signs for parents, siblings, and relatives",
  },
  Destinations: {
    title: "Unit 3 — Places",
    description: "Navigate banks, hospitals, and public buildings",
  },
  Jours: {
    title: "Unit 4 — Days of the week",
    description: "Sunday through Saturday in Tunisian Sign Language",
  },
  Transport: {
    title: "Unit 5 — Transport",
    description: "Cars, taxis, trains, and getting around Tunisia",
  },
};

const LESSON_TITLES: Record<string, string[]> = {
  Demandes: ["Hello & welcome", "Yes, no & you", "Questions", "Today & learning", "Media & culture", "Health & services"],
  Famille: ["Parents & children", "Siblings & family", "Grandparents"],
  Destinations: ["Home & money", "Public services"],
  Jours: ["Weekdays (Sun–Wed)", "Weekdays (Thu–Sat)"],
  Transport: ["Road & rail", "Shared transport"],
};

function buildTslUnits(): TslUnitPlan[] {
  const byCategory = new Map<string, VocabSign[]>();
  for (const s of vocab.signs) {
    const list = byCategory.get(s.category) ?? [];
    list.push(s);
    byCategory.set(s.category, list);
  }

  const order = ["Demandes", "Famille", "Destinations", "Jours", "Transport"];
  return order.map((cat, unitIdx) => {
    const signs = byCategory.get(cat) ?? [];
    const chunks = chunk(signs, 4);
    const titles = LESSON_TITLES[cat] ?? chunks.map((_, i) => `Lesson ${i + 1}`);

    const lessons: TslLessonPlan[] = chunks.map((group, li) => ({
      title: titles[li] ?? `${cat} — part ${li + 1}`,
      description: `Learn ${group.length} Tunisian signs`,
      category: cat,
      signs: group.map((s) => ({
        gloss: s.gloss,
        english: s.english,
        description: `${s.description} (${s.arabic})`,
        imageKey: s.gloss.toLowerCase(),
      })),
    }));

    const meta = CATEGORY_META[cat];
    return {
      title: meta.title,
      description: meta.description,
      orderIndex: unitIdx + 1,
      lessons,
    };
  });
}

export const TSL_UNITS = buildTslUnits();

export const TSL_SCENARIOS: Record<string, string> = {
  "3ASLEMA": "Someone greets you in Tunisian Sign Language.",
  MAR7BA: "A host signs welcome as you arrive.",
  LABES: "They answer that everything is fine.",
  NEKTEBLK: "They politely get your attention.",
  OUI: "They confirm with yes.",
  NON: "They refuse with no.",
  ENTI: "They point to you.",
  ASSAM: "They introduce their name.",
  T7EB: "They ask what you want.",
  TA3RAF: "They ask if you know something.",
  TA9RA: "They ask about reading.",
  N3AWNEK: "They offer to help you.",
  LYOUM: "They refer to today.",
  DEMANDE: "They make a request.",
  "5ADAMET": "They refer to civil service.",
  TA3LIM: "They talk about education.",
  RADIO: "They mention the radio.",
  TELVZA: "They refer to television.",
  THA9AFA: "They discuss culture.",
  CHABEB: "They talk about youth.",
  SE7A: "They mention health.",
  SIYE7A: "They discuss tourism.",
  BARNAMJK: "They refer to a program.",
  CV: "They mention a resume.",
  OM: "Which parent signs near the chin?",
  BOU: "Which parent signs near the forehead?",
  BENT: "Which child is the daughter?",
  EBEN: "Which child is the son?",
  O5T: "Which sibling is the sister?",
  "5OU": "Which sibling is the brother?",
  MAR2A: "They refer to a woman.",
  TFOL: "They refer to a child.",
  "3AYLA": "They sign about family.",
  JAD: "Which grandparent is male?",
  JADDA: "Which grandparent is female?",
  "5AL_3AM": "They refer to an uncle.",
  DAR: "They point toward home.",
  BANKA: "They need the bank.",
  BALADYA: "They refer to the municipality.",
  BOUSTA: "They need the post office.",
  MA7KMA: "They refer to the courthouse.",
  MOSTAWSAF: "They need a clinic.",
  SBITAR: "They need the hospital.",
  WZARA: "They refer to a ministry.",
  A7AD: "Which day is Sunday?",
  THNIN: "Which day is Monday?",
  THLETH: "Which day is Tuesday?",
  ERB3A: "Which day is Wednesday?",
  "5MIS": "Which day is Thursday?",
  JOM3A: "Which day is Friday?",
  SEBT: "Which day is Saturday?",
  KARHBA: "They refer to a car.",
  TAXI: "They need a taxi.",
  TRAIN: "They refer to the train.",
  LOUAGE: "They mention a shared taxi (louage).",
  METRO: "They refer to the metro.",
  CAR: "They refer to a bus.",
};
