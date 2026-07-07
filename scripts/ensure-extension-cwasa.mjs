/**
 * Ensure extension/3d has bundled CWASA assets before loading the extension.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BUNDLE = path.join(ROOT, "extension/3d/cwasa-bundle.json");
const REQUIRED = [
  "cwa/allcsa.js",
  "cwa/cwasa.css",
  "avatars/anna.jar",
  "sigml/asl/HELLO.sigml",
];

function isComplete() {
  if (!fs.existsSync(BUNDLE)) return false;
  return REQUIRED.every((rel) => fs.existsSync(path.join(ROOT, "extension/3d", rel)));
}

if (isComplete()) {
  console.log("Extension CWASA bundle already present.");
  process.exit(0);
}

console.log("Extension CWASA bundle missing — syncing from public cache…");
let result = spawnSync(process.execPath, ["scripts/ensure-cwasa-cache.mjs"], {
  cwd: ROOT,
  stdio: "inherit",
});
if (result.status !== 0) process.exit(result.status ?? 1);

result = spawnSync(process.execPath, ["scripts/sync-extension-cwasa.mjs"], {
  cwd: ROOT,
  stdio: "inherit",
});
process.exit(result.status ?? 1);
