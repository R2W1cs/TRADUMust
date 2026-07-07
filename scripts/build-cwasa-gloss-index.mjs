/**
 * Build CWASA gloss index from 3dasl categories + TRADUMUST vocabulary maps.
 * Usage: node scripts/build-cwasa-gloss-index.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public/asl-avatar/gloss-index.json");
const CATEGORIES_URL = "https://3dasl-avatar.vercel.app/categories_files.json";
const SIGML_BASE = "https://3dasl-avatar.vercel.app/sigml/";

/** English / ASL / BSL tokens → Arabic SiGML gloss filename (without .sigml) */
const ENGLISH_TO_GLOSS = {
  hello: "مرحبا", hi: "مرحبا", welcome: "مرحبا",
  yes: "نعم", no: "لا", please: "من فضلك", thanks: "شكرا", thank: "شكرا",
  "thank you": "شكرا", sorry: "آسف", good: "حسنا", well: "حسنا", fine: "حسنا",
  okay: "حسنا", ok: "حسنا", again: "مرة أخرى", only: "فقط", everything: "كل شيء",
  soon: "قريبا", much: "كثيرا", many: "كثيرا", directly: "مباشرة",
  me: "أنا", i: "أنا", my: "أنا", you: "أنت", we: "نحن", us: "نحن",
  mother: "أم", mom: "أم", father: "أب", dad: "أب", sister: "أخت", brother: "أخ",
  son: "ابن", daughter: "بنت", child: "طفل", family: "عائلة", woman: "امرأة",
  man: "رجل", water: "ماء", food: "طعام", coffee: "قهوة", hungry: "شهية",
  house: "بيت", home: "بيت", school: "مدرسة", book: "كتاب", word: "كلمة",
  today: "اليوم", tomorrow: "غدا", yesterday: "أمس", morning: "صباح",
  night: "الليل", now: "الآن", here: "هنا", always: "دائما", never: "أبدا",
  where: "أين", when: "متى", why: "لماذا", how: "كيف", what: "ماذا",
  who: "من", with: "مع", together: "معا", also: "أيضا", if: "إذا", until: "حتى",
  love: "يحب", learn: "يتعلم", help: "يساعد", walk: "يمشي", go: "يذهب",
  come: "يأتي", see: "يشاهد", know: "يعلم", want: "يطلب", think: "يفكر",
  read: "يقرأ", write: "يكتب على الآلة الكاتبة", play: "يلعب", work: "عمل",
  happy: "سعيد", sad: "حزين", tired: "متعب", angry: "غاضب", easy: "سهل",
  hard: "صعب", difficult: "صعب", new: "جديد", beautiful: "جميل", important: "مهم",
  hot: "حار", cold: "يشعر بالبرد", white: "أبيض", black: "أسود", red: "أحمر",
  blue: "أزرق", one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  sun: "شمس", tree: "شجرة", rain: "مطر", snow: "ثلج", sea: "سماء",
  car: "سائق", train: "قطار", plane: "طائرة", road: "طريق",
  france: "فرنسا", europe: "أوروبا", world: "عالم", city: "عاصمة",
  friend: "شاب", teacher: "أستاذ", student: "يتعلم", doctor: "طبيب أسنان",
  hospital: "مشكلة", money: "مال", time: "وقت", phone: "يتصل هاتفيا",
  understand: "يفهم", name: "اسم", question: "سؤال", answer: "يجيب",
  goodbye: "مرحبا", bye: "مرحبا",
};

/** French / LSF tokens → Arabic SiGML gloss */
const FRENCH_TO_GLOSS = {
  bonjour: "مرحبا", salut: "مرحبا", oui: "نعم", non: "لا", merci: "شكرا",
  "s il vous plait": "من فضلك", silvousplait: "من فضلك", pardon: "آسف",
  desole: "آسف", moi: "أنا", je: "أنا", tu: "أنت", vous: "أنت", nous: "نحن",
  mere: "أم", pere: "أب", soeur: "أخت", frere: "أخ", fils: "ابن", fille: "بنت",
  enfant: "طفل", famille: "عائلة", femme: "امرأة", homme: "رجل", eau: "ماء",
  nourriture: "طعام", cafe: "قهوة", maison: "بيت", ecole: "مدرسة", livre: "كتاب",
  aujourdhui: "اليوم", demain: "غدا", hier: "أمس", matin: "صباح", nuit: "الليل",
  maintenant: "الآن", ici: "هنا", toujours: "دائما", jamais: "أبدا",
  ou: "أين", quand: "متى", pourquoi: "لماذا", comment: "كيف", quoi: "ماذا",
  qui: "من", avec: "مع", aussi: "أيضا", aimer: "يحب", apprendre: "يتعلم",
  aider: "يساعد", marcher: "يمشي", aller: "يذهب", venir: "يأتي", voir: "يشاهد",
  savoir: "يعلم", lire: "يقرأ", ecrire: "يكتب على الآلة الكاتبة", jouer: "يلعب",
  travail: "عمل", heureux: "سعيد", triste: "حزين", fatigue: "متعب",
  facile: "سهل", difficile: "صعب", nouveau: "جديد", beau: "جميل", important: "مهم",
  un: "1", deux: "2", trois: "3", quatre: "4", cinq: "5",
  soleil: "شمس", arbre: "شجرة", pluie: "مطر", neige: "ثلج",
  voiture: "سائق", avion: "طائرة", route: "طريق", france: "فرنسا",
  monde: "عالم", ami: "شاب", professeur: "أستاذ", argent: "مال", temps: "وقت",
  comprendre: "يفهم", nom: "اسم", question: "سؤال", reponse: "يجيب",
};

function normalizeKey(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addMap(target, key, gloss, allGlosses) {
  if (!key || !gloss || !allGlosses.has(gloss)) return;
  target[key] = gloss;
}

async function main() {
  const res = await fetch(CATEGORIES_URL);
  if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
  const categories = await res.json();

  const allGlosses = new Set();
  for (const words of Object.values(categories)) {
    for (const w of words) allGlosses.add(w);
  }

  const englishToGloss = {};
  const frenchToGloss = {};
  const arabicGlosses = [...allGlosses];

  for (const [en, gloss] of Object.entries(ENGLISH_TO_GLOSS)) {
    addMap(englishToGloss, normalizeKey(en), gloss, allGlosses);
  }
  for (const [fr, gloss] of Object.entries(FRENCH_TO_GLOSS)) {
    addMap(frenchToGloss, normalizeKey(fr), gloss, allGlosses);
  }

  // Arabic gloss → itself for direct lookup
  const arabicToGloss = {};
  for (const g of allGlosses) arabicToGloss[g] = g;

  // TSL vocabulary bridges
  const tslPath = path.join(ROOT, "data/tsl/vocabulary.json");
  const tslEnglish = {};
  const tslArabic = {};
  if (fs.existsSync(tslPath)) {
    const tsl = JSON.parse(fs.readFileSync(tslPath, "utf8"));
    for (const sign of tsl.signs ?? []) {
      const gloss = sign.arabic;
      if (!gloss || !allGlosses.has(gloss)) continue;
      if (sign.english) {
        addMap(tslEnglish, normalizeKey(sign.english), gloss, allGlosses);
        addMap(englishToGloss, normalizeKey(sign.english), gloss, allGlosses);
      }
      tslArabic[gloss] = gloss;
      if (sign.gloss) tslEnglish[normalizeKey(sign.gloss)] = gloss;
    }
  }

  const index = {
    version: 1,
    builtAt: new Date().toISOString(),
    sigmlBase: SIGML_BASE,
    glossCount: allGlosses.size,
    arabicGlosses,
    englishToGloss,
    frenchToGloss,
    arabicToGloss,
    tslEnglish,
    tslArabic,
    categories,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(index, null, 2));
  console.log(`Wrote ${OUT} (${allGlosses.size} glosses, ${Object.keys(englishToGloss).length} English mappings)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
