/**
 * SignBridge D2 — Landmark Classifier
 * JS port of lib/landmark-classifier.ts for use in the extension iframe.
 * Operates on MediaPipe 21-point hand landmarks (normalized 0-1 coords).
 */

// Landmark index constants (MediaPipe convention)
const LM = {
  WRIST:       0,
  THUMB_CMC:   1, THUMB_MCP:  2, THUMB_IP:   3, THUMB_TIP:  4,
  INDEX_MCP:   5, INDEX_PIP:  6, INDEX_DIP:  7, INDEX_TIP:  8,
  MIDDLE_MCP:  9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP:   13, RING_PIP:  14, RING_DIP:   15, RING_TIP:   16,
  PINKY_MCP:  17, PINKY_PIP: 18, PINKY_DIP:  19, PINKY_TIP:  20,
};

// ── Geometry helpers ──────────────────────────────────────────────────────────

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Is finger extended? Compares tip-to-wrist distance vs pip-to-wrist */
function up(lm, tip, pip) {
  return dist(lm[tip], lm[LM.WRIST]) > dist(lm[pip], lm[LM.WRIST]);
}

function thumbOut(lm) {
  return dist(lm[LM.THUMB_TIP], lm[LM.INDEX_MCP]) > dist(lm[LM.THUMB_IP], lm[LM.INDEX_MCP]);
}

function pinch(lm) {
  return dist(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]) < 0.06;
}

function bentDown(lm, tip, pip, mcp) {
  return lm[tip].y > lm[pip].y && lm[pip].y > lm[mcp].y;
}

function zone(lm) {
  const y = lm[LM.WRIST].y;
  if (y < 0.28) return 'FOREHEAD';
  if (y < 0.40) return 'FACE';
  if (y < 0.52) return 'CHIN';
  if (y < 0.66) return 'CHEST';
  return 'LOW';
}

/** Analyse palm motion buffer. Returns 'SHAKE' | 'CIRCLE' | 'UP' | 'DOWN' | 'STATIC' */
export function motionFromBuffer(buf) {
  const n = buf.length;
  if (n < 8) return 'STATIC';

  // Oscillation detection (wave = rapid reversals in x)
  let reversals = 0, prevDir = 0;
  for (let i = 1; i < n; i++) {
    const d = buf[i].x - buf[i - 1].x;
    if (Math.abs(d) > 0.004) {
      const dir = d > 0 ? 1 : -1;
      if (prevDir !== 0 && dir !== prevDir) reversals++;
      prevDir = dir;
    }
  }
  if (reversals >= 3) return 'SHAKE';

  // Net displacement
  const dx = buf[n - 1].x - buf[0].x;
  const dy = buf[n - 1].y - buf[0].y;

  // Circle detection (radius check)
  const pts = buf.slice(-20);
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const radii = pts.map(p => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2));
  const avgR  = radii.reduce((s, r) => s + r, 0) / radii.length;
  const minR  = Math.min(...radii);
  if (avgR > 0.04 && minR > 0.01 && Math.abs(dx) < 0.06 && Math.abs(dy) < 0.06) return 'CIRCLE';

  if (Math.abs(dy) > 0.08) return dy < 0 ? 'UP' : 'DOWN';

  return 'STATIC';
}

// ── Main classifier ───────────────────────────────────────────────────────────

/**
 * Classify a hand pose from landmarks.
 * @param {Array} lm1 - Primary hand landmarks (21 points, each {x, y, z})
 * @param {Array} buf - Motion buffer [{x, y, time}]
 * @param {Array} lm2 - Secondary hand landmarks (optional)
 * @returns {{ key: string, label: string, confidence: number } | null}
 */
export function classifyLandmarks(lm1, buf, lm2) {
  if (!lm1 || lm1.length < 21) return null;

  // Finger extension states
  const i  = up(lm1, LM.INDEX_TIP,  LM.INDEX_PIP);
  const m  = up(lm1, LM.MIDDLE_TIP, LM.MIDDLE_PIP);
  const r  = up(lm1, LM.RING_TIP,   LM.RING_PIP);
  const p  = up(lm1, LM.PINKY_TIP,  LM.PINKY_PIP);
  const t  = thumbOut(lm1);
  const up4 = i && m && r && p;   // all 4 fingers extended
  const fist = !i && !m && !r && !p;

  const z  = zone(lm1);
  const mv = motionFromBuffer(buf);

  // ── HELLO — open hand + raised + waving ───────────────────────────────────
  if (up4 && lm1[LM.WRIST].y < 0.55 && (mv === 'SHAKE' || mv === 'CIRCLE')) {
    return { key: 'HELLO', label: 'Hello', confidence: 0.92 };
  }
  // HELLO — salute variant (forehead/face, static/down)
  if (up4 && (z === 'FOREHEAD' || z === 'FACE') && (mv === 'DOWN' || mv === 'STATIC')) {
    return { key: 'HELLO', label: 'Hello', confidence: 0.80 };
  }

  // ── GOODBYE — wave at chest level ─────────────────────────────────────────
  if (up4 && lm1[LM.WRIST].y >= 0.52 && mv === 'SHAKE') {
    return { key: 'GOODBYE', label: 'Goodbye', confidence: 0.88 };
  }

  // ── THANK YOU — flat hand from chin forward ────────────────────────────────
  if (up4 && (z === 'CHIN' || z === 'FACE') && mv === 'STATIC' && !t) {
    return { key: 'THANK_YOU', label: 'Thank You', confidence: 0.82 };
  }

  // ── PLEASE — hand circles on chest ────────────────────────────────────────
  if (up4 && z === 'CHEST' && mv === 'CIRCLE') {
    return { key: 'PLEASE', label: 'Please', confidence: 0.85 };
  }

  // ── SORRY — fist circles on chest ─────────────────────────────────────────
  if (fist && z === 'CHEST' && mv === 'CIRCLE') {
    return { key: 'SORRY', label: 'Sorry', confidence: 0.83 };
  }

  // ── YES — fist nodding ─────────────────────────────────────────────────────
  if (fist && (z === 'CHIN' || z === 'CHEST') && mv === 'UP') {
    return { key: 'YES', label: 'Yes', confidence: 0.80 };
  }

  // ── NO — index finger side to side ────────────────────────────────────────
  if (i && !m && !r && !p && mv === 'SHAKE') {
    return { key: 'NO', label: 'No', confidence: 0.82 };
  }

  // ── HELP — thumb up ────────────────────────────────────────────────────────
  if (fist && t && mv !== 'SHAKE') {
    return { key: 'HELP', label: 'Help', confidence: 0.75 };
  }

  // ── ILY — thumb + index + pinky ───────────────────────────────────────────
  if (t && i && !m && !r && p) {
    return { key: 'ILY', label: 'I Love You', confidence: 0.88 };
  }

  // ── WHERE — index pointing up, hand shaking ────────────────────────────────
  if (i && !m && !r && !p && mv === 'SHAKE' && (z === 'CHIN' || z === 'CHEST')) {
    return { key: 'WHERE', label: 'Where', confidence: 0.77 };
  }

  return null;
}
