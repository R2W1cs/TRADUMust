/**
 * SignBridge — Icon Generator
 *
 * Run with Node.js (no extra dependencies) to generate the PNG icon files
 * required by the Chrome extension manifest.
 *
 * Usage:
 *   node extension/icons/generate-icons.js
 *
 * Requires: Node.js 18+ (uses built-in Canvas via --experimental-vm-modules
 * OR the 'canvas' npm package for older Node versions).
 *
 * Alternative: Open icon-preview.html in your browser and use DevTools
 * to screenshot each canvas, or use any image editor to create:
 *   icon16.png  (16×16)
 *   icon48.png  (48×48)
 *   icon128.png (128×128)
 *
 * Design: Indigo (#4338CA) circle background with a white "ILY" hand
 * shape (index + pinky + thumb extended — the ASL "I Love You" sign,
 * widely recognized as a Deaf culture symbol).
 *
 * The generated icons match the LinguaBridge Academy brand palette.
 */

const fs = require('fs');
const path = require('path');

// Try to use the 'canvas' package; if not available, generate SVG fallbacks
let Canvas;
try {
  Canvas = require('canvas');
} catch {
  console.log('canvas package not found — generating SVG icons instead.');
  Canvas = null;
}

const SIZES = [16, 48, 128];
const OUTPUT_DIR = path.dirname(__filename);

// ── SVG icon definition ────────────────────────────────────────────────────────
// ILY handshape: thumb out, index up, pinky up, middle + ring folded
function svgIcon(size) {
  const s = size / 128; // scale factor
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 128 128"
     xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SignBridge icon">
  <!-- Background circle -->
  <circle cx="64" cy="64" r="60" fill="#4338CA"/>
  <circle cx="64" cy="64" r="60" fill="url(#grad)"/>
  <defs>
    <radialGradient id="grad" cx="40%" cy="35%">
      <stop offset="0%"   stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#312E81"/>
    </radialGradient>
  </defs>

  <!-- ILY hand — simplified iconic representation -->
  <!-- Palm -->
  <rect x="42" y="68" width="44" height="28" rx="10" fill="white" opacity="0.95"/>

  <!-- Thumb (extended left) -->
  <rect x="24" y="68" width="22" height="12" rx="6" fill="white" opacity="0.95"/>

  <!-- Index finger (up) -->
  <rect x="76" y="28" width="12" height="44" rx="6" fill="white" opacity="0.95"/>

  <!-- Middle finger (folded — knuckle only) -->
  <ellipse cx="63" cy="68" rx="5" ry="3" fill="#4338CA" opacity="0.3"/>

  <!-- Ring finger (folded — knuckle only) -->
  <ellipse cx="53" cy="68" rx="5" ry="3" fill="#4338CA" opacity="0.3"/>

  <!-- Pinky finger (up) -->
  <rect x="42" y="32" width="10" height="40" rx="5" fill="white" opacity="0.95"/>

  <!-- Small glow accent -->
  <circle cx="64" cy="64" r="58" fill="none" stroke="white" stroke-width="2" opacity="0.08"/>
</svg>`;
}

// ── Write SVG icons (always works, no dependencies) ────────────────────────────
for (const size of SIZES) {
  const svgPath = path.join(OUTPUT_DIR, `icon${size}.svg`);
  fs.writeFileSync(svgPath, svgIcon(size), 'utf8');
  console.log(`✓ Written ${svgPath}`);
}

console.log('\nSVG icons generated. Chrome accepts SVG for web_accessible_resources.');
console.log('For manifest icons (PNG required), either:');
console.log('  1. Install canvas: npm install canvas  →  re-run this script');
console.log('  2. Open icon-preview.html in a browser and export each canvas as PNG');
console.log('  3. Use any design tool to create 16px, 48px, 128px PNGs from the SVG\n');

// ── Canvas-based PNG generation (if canvas package available) ─────────────────
if (Canvas) {
  const { createCanvas } = Canvas;

  for (const size of SIZES) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background circle
    const gradient = ctx.createRadialGradient(size*0.4, size*0.35, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, '#6366F1');
    gradient.addColorStop(1, '#312E81');
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 1, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Scale factor
    const s = size / 128;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';

    // Palm
    ctx.beginPath();
    ctx.roundRect(42*s, 68*s, 44*s, 28*s, 10*s);
    ctx.fill();

    // Thumb
    ctx.beginPath();
    ctx.roundRect(24*s, 68*s, 22*s, 12*s, 6*s);
    ctx.fill();

    // Index finger
    ctx.beginPath();
    ctx.roundRect(76*s, 28*s, 12*s, 44*s, 6*s);
    ctx.fill();

    // Pinky finger
    ctx.beginPath();
    ctx.roundRect(42*s, 32*s, 10*s, 40*s, 5*s);
    ctx.fill();

    // Glow ring
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Save PNG
    const pngPath = path.join(OUTPUT_DIR, `icon${size}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(pngPath, buffer);
    console.log(`✓ Written ${pngPath} (${size}×${size} PNG)`);
  }
}
