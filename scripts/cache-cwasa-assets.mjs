/**
 * Download CWASA runtime + 3 avatar JARs for local caching.
 * Usage: node scripts/cache-cwasa-assets.mjs
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_ROOT = path.join(ROOT, "public/asl-avatar");
const REMOTE = "https://3dasl-avatar.vercel.app";
const VHG = "https://vhg.cmp.uea.ac.uk/tech/jas/vhg2021";

const ASSETS = [
  { url: `${REMOTE}/cwa/allcsa.js`, dest: "cwa/allcsa.js" },
  { url: `${REMOTE}/cwa/cwasa.css`, dest: "cwa/cwasa.css" },
  { url: `${VHG}/cwa/h2s.xsl`, dest: "cwa/h2s.xsl" },
  { url: `${VHG}/cwa/shaders/qskin.vert`, dest: "cwa/shaders/qskin.vert" },
  { url: `${VHG}/cwa/shaders/qskin.frag`, dest: "cwa/shaders/qskin.frag" },
  { url: `${REMOTE}/avatars/COMMON.jar`, dest: "avatars/COMMON.jar" },
  { url: `${REMOTE}/avatars/anna.jar`, dest: "avatars/anna.jar" },
  { url: `${REMOTE}/avatars/marc.jar`, dest: "avatars/marc.jar" },
  { url: `${REMOTE}/avatars/francoise.jar`, dest: "avatars/francoise.jar" },
];

function sha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function download(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

async function main() {
  const manifestPath = path.join(OUT_ROOT, "manifest.json");
  let manifest = { version: 1, cachedAt: null, files: {} };
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  }

  console.log("Caching CWASA assets to public/asl-avatar/ …");
  let downloaded = 0;
  let skipped = 0;

  for (const asset of ASSETS) {
    const dest = path.join(OUT_ROOT, asset.dest);
    const existing = manifest.files[asset.dest];

    if (fs.existsSync(dest) && existing?.sha256) {
      const hash = sha256(dest);
      if (hash === existing.sha256) {
        console.log(`  skip ${asset.dest} (unchanged)`);
        skipped++;
        continue;
      }
    }

    process.stdout.write(`  fetch ${asset.dest} … `);
    const bytes = await download(asset.url, dest);
    const hash = sha256(dest);
    manifest.files[asset.dest] = { sha256: hash, bytes, url: asset.url };
    console.log(`${(bytes / 1024 / 1024).toFixed(2)} MB`);
    downloaded++;
  }

  const cwacfg = {
    description: "TRADUMUST local CWASA installation",
    jasBase: "/asl-avatar/",
    jasVersionTag: "tradumust",
    sigmlBase: "sigml",
    avJARBase: "avatars",
    avJSONBase: "avjson",
    useAvatarJARs: true,
    animgenFPS: 30,
    animgenServer: null,
    avs: ["anna", "marc", "francoise"],
    avsfull: ["anna", "marc", "francoise"],
    avSettings: [
      {
        width: 640,
        height: 520,
        avList: "avs",
        initAv: "anna",
        allowFrameSteps: false,
        allowSiGMLText: false,
        initSiGMLURL: null,
      },
    ],
  };

  const cwacfgPath = path.join(OUT_ROOT, "cwa/cwacfg.json");
  fs.mkdirSync(path.dirname(cwacfgPath), { recursive: true });
  fs.writeFileSync(cwacfgPath, JSON.stringify(cwacfg, null, 2));

  manifest.cachedAt = new Date().toISOString();
  manifest.sigmlRemote = `${REMOTE}/sigml/`;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Done: ${downloaded} downloaded, ${skipped} skipped.`);
  console.log(`Total cached: ${Object.keys(manifest.files).length} files`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
