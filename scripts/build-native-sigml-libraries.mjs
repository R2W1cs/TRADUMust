/**
 * Mirror ALSL SiGML from 3dasl + generate native ASL starter SiGML.
 * Usage: node scripts/build-native-sigml-libraries.mjs
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ALSL_DIR = path.join(ROOT, "public/asl-avatar/sigml/alsl");
const ASL_DIR = path.join(ROOT, "public/asl-avatar/sigml/asl");
const INDEX_OUT = path.join(ROOT, "public/asl-avatar/gloss-index.json");
const CATEGORIES_URL = "https://3dasl-avatar.vercel.app/categories_files.json";
const SIGML_REMOTE = "https://3dasl-avatar.vercel.app/sigml/";

/** Native ASL glosses — hamgestural SiGML templates (not Arabic). */
const ASL_SIGML = {
  HELLO: `<sigml><hamgestural_sign gloss="HELLO"><sign_manual><handconfig handshape="flat" thumbpos="out"/><handconfig extfidir="ul"/><handconfig palmor="l"/><location_bodyarm location="shouldertop"/><directedmotion direction="o" curve="o"/></sign_manual></hamgestural_sign></sigml>`,
  HI: `<sigml><hamgestural_sign gloss="HI"><sign_manual><handconfig handshape="flat" thumbpos="out"/><handconfig extfidir="ul"/><handconfig palmor="l"/><location_bodyarm location="shouldertop"/><directedmotion direction="o" curve="o"/></sign_manual></hamgestural_sign></sigml>`,
  GOODBYE: `<sigml><hamgestural_sign gloss="GOODBYE"><sign_manual><handconfig handshape="flat" thumbpos="out"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/><directedmotion direction="lr" curve="lr"/></sign_manual></hamgestural_sign></sigml>`,
  THANK_YOU: `<sigml><hamgestural_sign gloss="THANK_YOU"><sign_manual><handconfig handshape="flat" thumbpos="out"/><handconfig extfidir="ol"/><handconfig palmor="u"/><location_bodyarm location="chin"/><directedmotion direction="o" curve="o"/></sign_manual></hamgestural_sign></sigml>`,
  PLEASE: `<sigml><hamgestural_sign gloss="PLEASE"><sign_manual><handconfig handshape="flat" thumbpos="out"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="chest"/><directedmotion direction="c" curve="c"/></sign_manual></hamgestural_sign></sigml>`,
  SORRY: `<sigml><hamgestural_sign gloss="SORRY"><sign_manual><handconfig handshape="fist" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="chest"/><directedmotion direction="c" curve="c"/></sign_manual></hamgestural_sign></sigml>`,
  YES: `<sigml><hamgestural_sign gloss="YES"><sign_manual><handconfig handshape="fist" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/><directedmotion direction="u" curve="u"/><directedmotion direction="d" curve="d"/></sign_manual></hamgestural_sign></sigml>`,
  NO: `<sigml><hamgestural_sign gloss="NO"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="chest"/><directedmotion direction="lr" curve="lr"/></sign_manual></hamgestural_sign></sigml>`,
  WHERE: `<sigml><hamgestural_sign gloss="WHERE"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="il"/><handconfig palmor="r"/><location_bodyarm location="shoulders"/><directedmotion direction="lr" curve="lr"/></sign_manual></hamgestural_sign></sigml>`,
  WHAT: `<sigml><hamgestural_sign gloss="WHAT"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="u"/><location_bodyarm location="shoulders"/><directedmotion direction="u" curve="u"/></sign_manual></hamgestural_sign></sigml>`,
  WHO: `<sigml><hamgestural_sign gloss="WHO"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="chin"/><directedmotion direction="c" curve="c"/></sign_manual></hamgestural_sign></sigml>`,
  WHEN: `<sigml><hamgestural_sign gloss="WHEN"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/><directedmotion direction="c" curve="c"/></sign_manual></hamgestural_sign></sigml>`,
  WHY: `<sigml><hamgestural_sign gloss="WHY"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="forehead"/><directedmotion direction="o" curve="o"/></sign_manual></hamgestural_sign></sigml>`,
  HOW: `<sigml><hamgestural_sign gloss="HOW"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="chest"/><par_motion><directedmotion direction="u" curve="u"/><directedmotion direction="d" curve="d"/></par_motion></sign_manual></hamgestural_sign></sigml>`,
  HELP: `<sigml><hamgestural_sign gloss="HELP"><sign_manual><handconfig handshape="fist" thumbpos="up"/><handconfig extfidir="u"/><handconfig palmor="l"/><location_bodyarm location="chest"/><directedmotion direction="u" curve="u"/></sign_manual></hamgestural_sign></sigml>`,
  UNDERSTAND: `<sigml><hamgestural_sign gloss="UNDERSTAND"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="il"/><handconfig palmor="r"/><location_bodyarm location="forehead"/><directedmotion direction="u" curve="u"/></sign_manual></hamgestural_sign></sigml>`,
  KNOW: `<sigml><hamgestural_sign gloss="KNOW"><sign_manual><handconfig handshape="flat" thumbpos="out"/><handconfig extfidir="il"/><handconfig palmor="r"/><location_bodyarm location="forehead"/><directedmotion direction="u" curve="u"/></sign_manual></hamgestural_sign></sigml>`,
  WANT: `<sigml><hamgestural_sign gloss="WANT"><sign_manual><handconfig handshape="flat" thumbpos="out"/><handconfig extfidir="ol"/><handconfig palmor="d"/><location_bodyarm location="chest"/><directedmotion direction="i" curve="i"/></sign_manual></hamgestural_sign></sigml>`,
  LOVE: `<sigml><hamgestural_sign gloss="LOVE"><sign_manual><handconfig handshape="fist" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="chest"/><par_motion><directedmotion direction="c" curve="c"/></par_motion></sign_manual></hamgestural_sign></sigml>`,
  GO: `<sigml><hamgestural_sign gloss="GO"><sign_manual><handconfig handshape="flat" thumbpos="out"/><handconfig extfidir="ol"/><handconfig palmor="d"/><location_bodyarm location="chest"/><directedmotion direction="o" curve="o"/></sign_manual></hamgestural_sign></sigml>`,
  COME: `<sigml><hamgestural_sign gloss="COME"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="il"/><handconfig palmor="u"/><location_bodyarm location="chest"/><directedmotion direction="i" curve="i"/></sign_manual></hamgestural_sign></sigml>`,
  SEE: `<sigml><hamgestural_sign gloss="SEE"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="il"/><handconfig palmor="r"/><location_bodyarm location="eyes"/><directedmotion direction="o" curve="o"/></sign_manual></hamgestural_sign></sigml>`,
  LEARN: `<sigml><hamgestural_sign gloss="LEARN"><sign_manual><handconfig handshape="flat" thumbpos="out"/><handconfig extfidir="ol"/><handconfig palmor="u"/><location_bodyarm location="palm"/><directedmotion direction="u" curve="u"/><location_bodyarm location="forehead"/></sign_manual></hamgestural_sign></sigml>`,
  ME: `<sigml><hamgestural_sign gloss="ME"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="il"/><handconfig palmor="l"/><location_bodyarm location="chest"/></sign_manual></hamgestural_sign></sigml>`,
  YOU: `<sigml><hamgestural_sign gloss="YOU"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="chest"/><directedmotion direction="o" curve="o"/></sign_manual></hamgestural_sign></sigml>`,
  GOOD: `<sigml><hamgestural_sign gloss="GOOD"><sign_manual><handconfig handshape="flat" thumbpos="out"/><handconfig extfidir="ol"/><handconfig palmor="u"/><location_bodyarm location="chin"/><directedmotion direction="d" curve="d"/></sign_manual></hamgestural_sign></sigml>`,
  FINE: `<sigml><hamgestural_sign gloss="FINE"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="chest"/><directedmotion direction="o" curve="o"/></sign_manual></hamgestural_sign></sigml>`,
  MORNING: `<sigml><hamgestural_sign gloss="MORNING"><sign_manual><handconfig handshape="flat" thumbpos="out"/><handconfig extfidir="ol"/><handconfig palmor="d"/><location_bodyarm location="arm"/><directedmotion direction="u" curve="u"/></sign_manual></hamgestural_sign></sigml>`,
  NIGHT: `<sigml><hamgestural_sign gloss="NIGHT"><sign_manual><handconfig handshape="flat" thumbpos="out"/><handconfig extfidir="ol"/><handconfig palmor="d"/><location_bodyarm location="arm"/><directedmotion direction="d" curve="d"/></sign_manual></hamgestural_sign></sigml>`,
  NAME: `<sigml><hamgestural_sign gloss="NAME"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="palm"/><par_motion><directedmotion direction="lr" curve="lr"/></par_motion></sign_manual></hamgestural_sign></sigml>`,
  NEED: `<sigml><hamgestural_sign gloss="NEED"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="d"/><location_bodyarm location="chest"/><directedmotion direction="d" curve="d"/></sign_manual></hamgestural_sign></sigml>`,
  WAIT: `<sigml><hamgestural_sign gloss="WAIT"><sign_manual><handconfig handshape="flat" thumbpos="out"/><handconfig extfidir="u"/><handconfig palmor="l"/><location_bodyarm location="chest"/></sign_manual></hamgestural_sign></sigml>`,
  A: `<sigml><hamgestural_sign gloss="A"><sign_manual><handconfig handshape="fist" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  B: `<sigml><hamgestural_sign gloss="B"><sign_manual><handconfig handshape="flat" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  C: `<sigml><hamgestural_sign gloss="C"><sign_manual><handconfig handshape="ceeall" thumbpos="out"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  D: `<sigml><hamgestural_sign gloss="D"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  E: `<sigml><hamgestural_sign gloss="E"><sign_manual><handconfig handshape="ceeall" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  F: `<sigml><hamgestural_sign gloss="F"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  G: `<sigml><hamgestural_sign gloss="G"><sign_manual><handconfig handshape="finger2" thumbpos="out"/><handconfig extfidir="ol"/><handconfig palmor="d"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  H: `<sigml><hamgestural_sign gloss="H"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  I: `<sigml><hamgestural_sign gloss="I"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="u"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  J: `<sigml><hamgestural_sign gloss="J"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="u"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/><directedmotion direction="c" curve="c"/></sign_manual></hamgestural_sign></sigml>`,
  K: `<sigml><hamgestural_sign gloss="K"><sign_manual><handconfig handshape="finger2" thumbpos="out"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  L: `<sigml><hamgestural_sign gloss="L"><sign_manual><handconfig handshape="finger2" thumbpos="out"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  M: `<sigml><hamgestural_sign gloss="M"><sign_manual><handconfig handshape="fist" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  N: `<sigml><hamgestural_sign gloss="N"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  O: `<sigml><hamgestural_sign gloss="O"><sign_manual><handconfig handshape="ceeall" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  P: `<sigml><hamgestural_sign gloss="P"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="d"/><handconfig palmor="d"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  Q: `<sigml><hamgestural_sign gloss="Q"><sign_manual><handconfig handshape="finger2" thumbpos="out"/><handconfig extfidir="d"/><handconfig palmor="d"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  R: `<sigml><hamgestural_sign gloss="R"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  S: `<sigml><hamgestural_sign gloss="S"><sign_manual><handconfig handshape="fist" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  T: `<sigml><hamgestural_sign gloss="T"><sign_manual><handconfig handshape="fist" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  U: `<sigml><hamgestural_sign gloss="U"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  V: `<sigml><hamgestural_sign gloss="V"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  W: `<sigml><hamgestural_sign gloss="W"><sign_manual><handconfig handshape="finger2345" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  X: `<sigml><hamgestural_sign gloss="X"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  Y: `<sigml><hamgestural_sign gloss="Y"><sign_manual><handconfig handshape="finger2" thumbpos="out"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/></sign_manual></hamgestural_sign></sigml>`,
  Z: `<sigml><hamgestural_sign gloss="Z"><sign_manual><handconfig handshape="finger2" thumbpos="across"/><handconfig extfidir="ol"/><handconfig palmor="l"/><location_bodyarm location="shoulders"/><directedmotion direction="lr" curve="lr"/></sign_manual></hamgestural_sign></sigml>`,
};

const ENGLISH_TO_ASL = {
  hello: "HELLO", hi: "HI", hey: "HELLO", goodbye: "GOODBYE", bye: "GOODBYE",
  thanks: "THANK_YOU", thank: "THANK_YOU", "thank you": "THANK_YOU",
  please: "PLEASE", sorry: "SORRY", yes: "YES", yeah: "YES", no: "NO", nop: "NO",
  where: "WHERE", what: "WHAT", who: "WHO", when: "WHEN", why: "WHY", how: "HOW",
  help: "HELP", understand: "UNDERSTAND", know: "KNOW", want: "WANT", love: "LOVE",
  go: "GO", come: "COME", see: "SEE", learn: "LEARN", me: "ME", i: "ME", my: "ME",
  you: "YOU", your: "YOU", good: "GOOD", well: "FINE", fine: "FINE", okay: "GOOD", ok: "GOOD",
  morning: "MORNING", night: "NIGHT", name: "NAME", need: "NEED", wait: "WAIT",
  "good morning": "GOOD", "good night": "NIGHT",
};

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function mirrorAlsl(categories) {
  fs.mkdirSync(ALSL_DIR, { recursive: true });
  const glosses = [];
  const skipped = [];
  for (const words of Object.values(categories)) {
    for (const gloss of words) {
      const dest = path.join(ALSL_DIR, `${gloss}.sigml`);
      if (fs.existsSync(dest)) {
        glosses.push(gloss);
        continue;
      }
      process.stdout.write(`  alsl: ${gloss} … `);
      try {
        const buf = await download(`${SIGML_REMOTE}${encodeURI(gloss)}.sigml`);
        fs.writeFileSync(dest, buf);
        glosses.push(gloss);
        console.log(`${(buf.length / 1024).toFixed(1)} KB`);
      } catch (err) {
        skipped.push(gloss);
        console.log(`skip (${err.message})`);
      }
    }
  }
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} missing remote glosses`);
  }
  return glosses;
}

function writeAslLibrary() {
  fs.mkdirSync(ASL_DIR, { recursive: true });
  for (const [gloss, xml] of Object.entries(ASL_SIGML)) {
    fs.writeFileSync(path.join(ASL_DIR, `${gloss}.sigml`), xml);
  }
  return Object.keys(ASL_SIGML);
}

async function main() {
  console.log("Building native SiGML libraries…");

  const res = await fetch(CATEGORIES_URL);
  if (!res.ok) throw new Error("categories fetch failed");
  const categories = await res.json();

  console.log("ALSL (Arabic Algerian Sign Language) — mirroring from 3dasl…");
  const alslGlosses = await mirrorAlsl(categories);

  console.log("ASL — writing native gestural SiGML starter library…");
  const aslGlosses = writeAslLibrary();

  const index = {
    version: 2,
    builtAt: new Date().toISOString(),
    libraries: {
      ALSL: { glossCount: alslGlosses.length, glosses: alslGlosses },
      ASL: { glossCount: aslGlosses.length, glosses: aslGlosses, englishToGloss: ENGLISH_TO_ASL },
    },
  };

  fs.writeFileSync(INDEX_OUT, JSON.stringify(index, null, 2));
  console.log(`Done: ALSL ${alslGlosses.length} signs, ASL ${aslGlosses.length} signs`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
