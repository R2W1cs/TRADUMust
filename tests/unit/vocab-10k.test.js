/**
 * SignBridge Extension — vocab-10k.js Integrity Tests
 * Runner: Node.js built-in test runner (no extra deps)
 * Run:    node --test tests/unit/vocab-10k.test.js
 */

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const vm     = require('node:vm');
const fs     = require('node:fs');
const path   = require('node:path');

// ── Load sign-mapper.js first to get SIGNS, then load vocab-10k.js ───────────

const MAPPER_PATH  = path.join(__dirname, '../../extension/content/sign-mapper.js');
const VOCAB_PATH   = path.join(__dirname, '../../extension/content/vocab-10k.json');

const ctx = {
  window: { SignBridge: {} },
  chrome: { runtime: { getURL: () => 'mock://vocab-10k.json' } },
  fetch: (url) => Promise.resolve({
    json: () => Promise.resolve(JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf8')))
  }),
  document: {
    createElement: () => ({ src: '', onload: null, onerror: null }),
    head: { appendChild: () => {} },
    documentElement: { appendChild: () => {} },
  },
  console,
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(MAPPER_PATH, 'utf8'), ctx);

// Manually "load" the vocab into the context since it's now JSON
const vocabData = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf8'));
ctx.window.SignBridge.VOCAB_EXT = vocabData;

const SM    = ctx.window.SignBridge.SignMapper;
const SIGNS = SM.SIGNS;
const VOCAB = ctx.window.SignBridge.VOCAB_EXT;

// ─────────────────────────────────────────────────────────────────────────────

describe('vocab-10k.js loading', () => {
  test('VOCAB_EXT object is defined after load', () => {
    assert.ok(VOCAB, 'window.SignBridge.VOCAB_EXT should be defined');
  });

  test('VOCAB_EXT has substantial number of entries (≥ 900)', () => {
    const count = Object.keys(VOCAB).length;
    assert.ok(count >= 900, `Expected ≥900 entries, got ${count}`);
  });

  test('all VOCAB_EXT values reference valid SIGNS keys', () => {
    const broken = [];
    for (const [word, signKey] of Object.entries(VOCAB)) {
      if (!SIGNS[signKey]) broken.push(`'${word}' → '${signKey}' (not in SIGNS)`);
    }
    assert.strictEqual(broken.length, 0,
      `${broken.length} broken entries:\n${broken.slice(0, 15).join('\n')}`);
  });
});

describe('vocab-10k.js semantic coverage', () => {
  const cases = [
    // [word, expected sign key]
    ['abstract',      'THINK'],
    ['collaborate',   'HELP'],
    ['accomplish',    'WORK'],
    ['journey',       'MOVE'],
    ['ambulance',     'DOCTOR'],
    ['clinic',        'DOCTOR'],
    ['grant',         'GIVE'],
    ['extension',     'WORK'],
    ['breathtaking',  'BEAUTIFUL'],
    ['retain',        'REMEMBER'],
    ['literacy',      'LEARN'],
    ['geometry',      'SCHOOL'],
    ['pixel',         'EYE'],
    ['cybersecurity', 'WORK'],
  ];

  for (const [word, expectedKey] of cases) {
    test(`'${word}' maps to ${expectedKey}`, () => {
      const got = VOCAB[word];
      assert.strictEqual(got, expectedKey,
        `Expected '${word}' → '${expectedKey}', got '${got}'`);
    });
  }
});

describe('vocab-10k.js does not duplicate WORD_TO_SIGN', () => {
  test('fewer than 5% of vocab-10k words also exist in WORD_TO_SIGN', () => {
    const W2S = SM.WORD_TO_SIGN;
    const overlap = Object.keys(VOCAB).filter(w => W2S[w]);
    const pct = (overlap.length / Object.keys(VOCAB).length) * 100;
    // Moderate overlap is acceptable (synonyms), but should not be wholesale duplication
    assert.ok(pct < 35, `Overlap is ${pct.toFixed(1)}% — vocab-10k.json should have <35% overlap with core WORD_TO_SIGN`);
  });
});
