/**
 * Bundle CWASA runtime + ASL SiGML into the Chrome extension for offline 3D signing.
 * Requires public/asl-avatar cache first (npm run cwasa:cache).
 *
 * Usage: node scripts/sync-extension-cwasa.mjs
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "public/asl-avatar");
const DEST = path.join(ROOT, "extension/3d");

const COPY_PATHS = [
  "cwa/allcsa.js",
  "cwa/cwasa.css",
  "cwa/cwacfg.json",
  "cwa/h2s.xsl",
  "cwa/shaders/qskin.vert",
  "cwa/shaders/qskin.frag",
  "avatars/COMMON.jar",
  "avatars/anna.jar",
  "avatars/marc.jar",
  "avatars/francoise.jar",
  "cwaclientcfg.json",
  "gloss-index.json",
];

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function copyFile(rel) {
  const from = path.join(SRC, rel);
  const to = path.join(DEST, rel);
  if (!fs.existsSync(from)) {
    throw new Error(`Missing ${from} — run npm run cwasa:cache first`);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  return fs.statSync(to).size;
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return 0;
  fs.mkdirSync(destDir, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const from = path.join(srcDir, entry.name);
    const to = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      count += copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
      count++;
    }
  }
  return count;
}

function main() {
  console.log("Syncing CWASA bundle to extension/3d/ …");

  let bytes = 0;
  for (const rel of COPY_PATHS) {
    const size = copyFile(rel);
    bytes += size;
    console.log(`  ${rel} (${(size / 1024).toFixed(1)} KB)`);
  }

  const aslCount = copyDir(path.join(SRC, "sigml/asl"), path.join(DEST, "sigml/asl"));
  console.log(`  sigml/asl/ (${aslCount} files)`);

  const manifest = {
    version: 1,
    syncedAt: new Date().toISOString(),
    files: Object.fromEntries(
      COPY_PATHS.map((rel) => {
        const file = path.join(DEST, rel);
        return [rel, { sha256: sha256(file), bytes: fs.statSync(file).size }];
      })
    ),
    aslGlossCount: aslCount,
  };

  fs.writeFileSync(path.join(DEST, "cwasa-bundle.json"), JSON.stringify(manifest, null, 2));
  console.log(`Done: ${(bytes / 1024 / 1024).toFixed(2)} MB runtime + ${aslCount} ASL glosses`);
}

main();
