/**
 * Generate PNG icons for the Chrome extension manifest.
 * Usage: node scripts/generate-extension-icons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../extension/icons");

// Minimal valid 1x1 PNG expanded via simple IHDR - use sharp-free approach:
// Write SVG and instruct user, OR embed precomputed small PNGs.

// Pre-generated 16x16 indigo PNG (valid PNG file)
const ICON16_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAH0lEQVR42mNk+M9Qz0AEYBxVSFUBCjBKqAqoCqgKqAqoCgAAGQMBAZ4l8kQAAAAASUVORK5CYII=";

function scalePngPlaceholder(size) {
  // For 48/128 use same solid color PNG - Chrome scales; better than missing file
  if (size === 16) return Buffer.from(ICON16_B64, "base64");
  // Build slightly larger solid PNG with pngjs-like minimal structure
  // Fallback: duplicate 16px - Chrome will upscale
  return Buffer.from(ICON16_B64, "base64");
}

for (const size of [16, 48, 128]) {
  const file = path.join(OUT, `icon${size}.png`);
  fs.writeFileSync(file, scalePngPlaceholder(size));
  console.log("Wrote", file);
}
