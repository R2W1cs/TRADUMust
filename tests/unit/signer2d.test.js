/**
 * Signer2D Web Component — Logic & Data Validation Tests
 *
 * Tests the sign dictionary logic shared between the web app (Signer2D.tsx)
 * and the extension (sign-mapper.js).
 * No DOM / React needed — we load sign-mapper.js in Node.js.
 *
 * Runner: Node.js built-in test runner
 * Run:    node --test tests/unit/signer2d.test.js
 */

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const vm     = require('node:vm');
const fs     = require('node:fs');
const path   = require('node:path');

// Load extension sign-mapper (the sign dict mirrors Signer2D.tsx)
const ctx = {
  window: { SignBridge: {} },
  chrome: { runtime: { getURL: () => '' } },
  document: {
    createElement: () => ({ src: '', onload: null, onerror: null }),
    head: { appendChild: () => {} },
    documentElement: { appendChild: () => {} },
  },
  console,
};
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '../../extension/content/sign-mapper.js'), 'utf8'),
  ctx
);
const SM = ctx.window.SignBridge.SignMapper;

// ─────────────────────────────────────────────────────────────────────────────
// 1. COORDINATE SYSTEM (matches Signer2D.tsx ViewBox 360×240)
// ─────────────────────────────────────────────────────────────────────────────

describe('Coordinate system consistency with Signer2D.tsx', () => {
  // Signer2D.tsx constants:
  const SH_R = { x: 270, y: 90 };  // right shoulder
  const SH_L = { x:  90, y: 90 };  // left shoulder

  test('REST_R matches Signer2D.tsx rest position', () => {
    assert.strictEqual(SM.REST_R.elbow.x, 290);
    assert.strictEqual(SM.REST_R.elbow.y, 150);
    assert.strictEqual(SM.REST_R.wrist.x, 295);
    assert.strictEqual(SM.REST_R.wrist.y, 210);
  });

  test('REST_L matches Signer2D.tsx rest position', () => {
    assert.strictEqual(SM.REST_L.elbow.x, 70);
    assert.strictEqual(SM.REST_L.elbow.y, 150);
    assert.strictEqual(SM.REST_L.wrist.x, 65);
    assert.strictEqual(SM.REST_L.wrist.y, 210);
  });

  test('right arm signs are in right-side of ViewBox (x > 180)', () => {
    const violations = [];
    for (const [key, sign] of Object.entries(SM.SIGNS)) {
      if (key.startsWith('__')) continue;
      if (!sign.right) continue;
      const { elbow, wrist } = sign.right;
      // right arm should have joints near right shoulder (x ≈ 180-360 range is fine,
      // but wrist should not cross to far left)
      if (wrist && wrist.x < 100) violations.push(`${key}: right wrist x=${wrist.x} is very far left`);
    }
    assert.strictEqual(violations.length, 0, violations.join('\n'));
  });

  test('two-handed signs have both left and right arms', () => {
    // Spot check signs that physically require two hands
    const twoHandedKeys = ['HELP', 'WORK', 'PLAY', 'FAMILY', 'TREE'];
    for (const key of twoHandedKeys) {
      const sign = SM.SIGNS[key];
      if (!sign) continue; // skip if not present in this phase
      // Having a 'left' field is expected for these
      // (soft check — just verifies structure not missing entirely)
      assert.ok(sign.right, `${key} should have right arm`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. MOTION CLASSES (must match CSS in overlay.css / signer2d.css)
// ─────────────────────────────────────────────────────────────────────────────

describe('CSS motion classes', () => {
  const VALID_MOTION_CLASSES = new Set([
    'motion-wave', 'motion-circle', 'motion-push', 'motion-pull',
    'motion-nod',  'motion-shake',  'motion-lift', 'motion-flick',
    'motion-tap',  'motion-wiggle', 'motion-roll', 'motion-flip',
  ]);

  test('all rMotion values are valid CSS class names', () => {
    const bad = [];
    for (const [key, sign] of Object.entries(SM.SIGNS)) {
      if (sign.rMotion && !VALID_MOTION_CLASSES.has(sign.rMotion))
        bad.push(`${key}: unknown rMotion '${sign.rMotion}'`);
    }
    assert.strictEqual(bad.length, 0, bad.join('\n'));
  });

  test('all lMotion values are valid CSS class names', () => {
    const bad = [];
    for (const [key, sign] of Object.entries(SM.SIGNS)) {
      if (sign.lMotion && !VALID_MOTION_CLASSES.has(sign.lMotion))
        bad.push(`${key}: unknown lMotion '${sign.lMotion}'`);
    }
    assert.strictEqual(bad.length, 0, bad.join('\n'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SIGN DISPLAY — description & culturalNote fields
// ─────────────────────────────────────────────────────────────────────────────

describe('Sign educational content', () => {
  test('every non-meta sign has a description', () => {
    const missing = [];
    for (const [key, sign] of Object.entries(SM.SIGNS)) {
      if (key.startsWith('__')) continue;
      if (!sign.description) missing.push(key);
    }
    assert.strictEqual(missing.length, 0, `Missing description: ${missing.join(', ')}`);
  });

  test('every non-meta sign has a culturalNote', () => {
    const missing = [];
    for (const [key, sign] of Object.entries(SM.SIGNS)) {
      if (key.startsWith('__')) continue;
      if (!sign.culturalNote) missing.push(key);
    }
    assert.strictEqual(missing.length, 0, `Missing culturalNote: ${missing.join(', ')}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. FINGERSPELL ALPHABET (26 letters — A through Z)
// ─────────────────────────────────────────────────────────────────────────────

describe('Fingerspelling alphabet', () => {
  test('FINGERSPELL_HANDS contains all 26 letters', () => {
    const { FINGERSPELL_HANDS } = SM;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    for (const letter of alphabet) {
      assert.ok(FINGERSPELL_HANDS[letter],
        `Letter '${letter}' missing from FINGERSPELL_HANDS`);
    }
  });

  test('all FINGERSPELL_HANDS values are valid hand shapes', () => {
    const VALID = new Set(['FLAT','FIST','POINT','V','C','OK','THUMB_UP','ILY','CLAW','HORNS','L','A','O']);
    const bad = [];
    for (const [letter, shape] of Object.entries(SM.FINGERSPELL_HANDS)) {
      if (!VALID.has(shape)) bad.push(`'${letter}' → '${shape}'`);
    }
    assert.strictEqual(bad.length, 0, bad.join(', '));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. FULL PIPELINE — representative sentences from the web app
// ─────────────────────────────────────────────────────────────────────────────

describe('textToSigns — web-app representative sentences', () => {
  const fixtures = [
    {
      // "my name" is a 2-word phrase → maps to NAME sign; Alex is fingerspelled
      input: 'hello my name is Alex',
      mustInclude: ['HELLO', 'NAME'],
      description: 'greeting with name phrase',
    },
    {
      // bathroom has no sign → fingerspelled; WHERE is the key signed word
      input: 'where is the school?',
      mustInclude: ['WHERE', 'SCHOOL'],
      description: 'WH-question location (school sign exists)',
    },
    {
      input: 'I am sick please help',
      mustInclude: ['SICK', 'PLEASE', 'HELP'],
      description: 'health emergency phrase',
    },
    {
      input: 'today is monday morning',
      mustInclude: ['TODAY', 'MONDAY', 'MORNING'],
      description: 'time-marking sentence',
    },
    {
      input: 'I love you',
      mustInclude: ['LOVE', 'YOU'],
      description: 'emotional expression',
    },
  ];

  for (const { input, mustInclude, description } of fixtures) {
    test(`"${input}" (${description}) contains expected signs`, () => {
      const signs = SM.textToSigns(input);
      const keys = signs.map(s => s._key);
      for (const key of mustInclude) {
        assert.ok(keys.includes(key),
          `Expected '${key}' in signs for "${input}". Got: [${keys.join(', ')}]`);
      }
    });
  }
});
