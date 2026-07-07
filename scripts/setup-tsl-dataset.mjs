/**
 * Copy one reference image per TSL sign into public/tsl/signs/
 * and register dataset path for ML extraction.
 *
 * Usage: node scripts/setup-tsl-dataset.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const VOCAB = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/tsl/vocabulary.json"), "utf8")
);

const RAW_ROOT = path.join(
  ROOT,
  "data/tsl-dataset-raw/(First ever) Tunisian Sign Language Dataset/Data"
);

const OUT_DIR = path.join(ROOT, "public/tsl/signs");

function findSignDir(signId, category) {
  const catDir = path.join(RAW_ROOT, category);
  if (!fs.existsSync(catDir)) return null;

  const entries = fs.readdirSync(catDir, { withFileTypes: true });
  const exact = entries.find((e) => e.isDirectory() && e.name.toLowerCase() === signId.toLowerCase());
  if (exact) return path.join(catDir, exact.name);

  const aliases = { metro: ["metro", "métro", "m\u00e9tro"] };
  const tryIds = [signId, ...(aliases[signId.toLowerCase()] ?? [])];
  for (const id of tryIds) {
    const match = entries.find((e) => e.isDirectory() && e.name.toLowerCase() === id.toLowerCase());
    if (match) return path.join(catDir, match.name);
  }

  const fuzzy = entries.find(
    (e) => e.isDirectory() && e.name.toLowerCase().replace(/[^a-z0-9]/g, "") === signId.toLowerCase().replace(/[^a-z0-9]/g, "")
  );
  return fuzzy ? path.join(catDir, fuzzy.name) : null;
}

function firstImage(dir) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort();
  return files[0] ? path.join(dir, files[0]) : null;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

let copied = 0;
let missing = [];

for (const sign of VOCAB.signs) {
  const dir = findSignDir(sign.id, sign.category);
  if (!dir) {
    missing.push(`${sign.category}/${sign.id}`);
    continue;
  }
  const img = firstImage(dir);
  if (!img) {
    missing.push(`${sign.category}/${sign.id} (no images)`);
    continue;
  }
  const ext = path.extname(img);
  const dest = path.join(OUT_DIR, `${sign.gloss.toLowerCase()}${ext}`);
  fs.copyFileSync(img, dest);
  copied++;
}

console.log(`TSL setup: copied ${copied}/${VOCAB.signs.length} reference images → public/tsl/signs/`);
if (missing.length) {
  console.warn("Missing:", missing.join(", "));
}
