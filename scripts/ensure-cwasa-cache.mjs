/**
 * Ensure CWASA assets are cached before dev server starts.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MANIFEST = path.join(ROOT, "public/asl-avatar/manifest.json");
const REQUIRED = [
  "cwa/allcsa.js",
  "cwa/cwasa.css",
  "cwa/h2s.xsl",
  "cwa/shaders/qskin.vert",
  "cwa/shaders/qskin.frag",
  "avatars/COMMON.jar",
  "avatars/anna.jar",
  "avatars/marc.jar",
  "avatars/francoise.jar",
];

function isComplete() {
  if (!fs.existsSync(MANIFEST)) return false;
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    return REQUIRED.every((rel) => {
      const file = path.join(ROOT, "public/asl-avatar", rel);
      return fs.existsSync(file) && manifest.files?.[rel]?.sha256;
    });
  } catch {
    return false;
  }
}

if (isComplete()) {
  console.log("CWASA assets already cached.");
  process.exit(0);
}

console.log("CWASA cache missing — downloading (~16 MB, one-time)…");
const result = spawnSync(process.execPath, ["scripts/cache-cwasa-assets.mjs"], {
  cwd: ROOT,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
