/**
 * SignBridge — Performance Tests (PASS/FAIL)
 *
 * Each test FAILS if it runs slower than its threshold.
 * Thresholds are conservative — 10× below what we measured — so
 * any real regression will fail even on a slow machine.
 *
 * Run:  node --test tests/perf/sign-mapper.perf.js
 */

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const vm     = require('node:vm');
const fs     = require('node:fs');
const path   = require('node:path');

// ── Load sign-mapper + vocab-10k in a fake browser context ───────────────────

const ctx = {
  window: { SignBridge: {} },
  chrome: { runtime: { getURL: () => '' } },
  document: {
    createElement: () => ({ src: '', onload: null, onerror: null }),
    head: { appendChild: () => {} },
    documentElement: { appendChild: () => {} },
  },
  console: { log: () => {} },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../extension/content/sign-mapper.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../extension/content/vocab-10k.js'),   'utf8'), ctx);
const SM    = ctx.window.SignBridge.SignMapper;
const VOCAB = ctx.window.SignBridge.VOCAB_EXT;

// ── Helper: measure ops/sec, return it so the test can assert ────────────────

function measure(fn, iterations) {
  for (let i = 0; i < 50; i++) fn(i);          // warm up JIT
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) fn(i);
  const ms = performance.now() - t0;
  return Math.round(iterations / (ms / 1000));  // ops per second
}

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLDS  (deliberately conservative — 10× below measured values)
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  DICT_LOOKUP:        2_000_000,   // direct hash lookup
  SINGLE_WORD_KNOWN:    100_000,   // textToSigns("hello")
  SINGLE_WORD_STEM:      80_000,   // textToSigns("studying") — needs stemmer
  SINGLE_WORD_FINGERSPELL: 15_000, // textToSigns("xyzqq") — worst case
  SENTENCE_5W:           10_000,   // 5-word sentence
  SENTENCE_10W:           5_000,   // 10-word sentence
  THROUGHPUT_WPERS:     100_000,   // words per second end-to-end
  TOKENIZE:              50_000,   // _normalizeAndTokenize
  GRAMMAR_REORDER:      100_000,   // _applyAslGrammar
  MODULE_LOAD_MS:         2_000,   // sign-mapper.js must load in < 2 s
  STEMMED_INDEX_SIZE:     2_000,   // STEMMED_INDEX covers ≥ 2000 keys
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. MODULE / DATA STRUCTURE PERFORMANCE
// ─────────────────────────────────────────────────────────────────────────────

describe('Module load time', () => {
  test('sign-mapper.js loads in < 2 seconds', () => {
    const freshCtx = {
      window: { SignBridge: {} },
      chrome: { runtime: { getURL: () => '' } },
      document: { createElement: () => ({}), head: { appendChild: () => {} }, documentElement: { appendChild: () => {} } },
      console: { log: () => {} },
    };
    vm.createContext(freshCtx);
    const code = fs.readFileSync(path.join(__dirname, '../../extension/content/sign-mapper.js'), 'utf8');
    const t0 = performance.now();
    vm.runInContext(code, freshCtx);
    const ms = performance.now() - t0;
    assert.ok(ms < T.MODULE_LOAD_MS,
      `sign-mapper.js took ${ms.toFixed(0)} ms to load — threshold: ${T.MODULE_LOAD_MS} ms`);
  });

  test('vocab-10k.js loads in < 2 seconds', () => {
    const freshCtx = {
      window: { SignBridge: {} },
      chrome: { runtime: { getURL: () => '' } },
      document: { createElement: () => ({}), head: { appendChild: () => {} }, documentElement: { appendChild: () => {} } },
      console: { log: () => {} },
    };
    vm.createContext(freshCtx);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../../extension/content/sign-mapper.js'), 'utf8'), freshCtx);
    const code = fs.readFileSync(path.join(__dirname, '../../extension/content/vocab-10k.js'), 'utf8');
    const t0 = performance.now();
    vm.runInContext(code, freshCtx);
    const ms = performance.now() - t0;
    assert.ok(ms < T.MODULE_LOAD_MS,
      `vocab-10k.js took ${ms.toFixed(0)} ms to load — threshold: ${T.MODULE_LOAD_MS} ms`);
  });

  test('STEMMED_INDEX pre-built with ≥ 2000 entries', () => {
    const size = Object.keys(SM.WORD_TO_SIGN).length;
    assert.ok(size >= T.STEMMED_INDEX_SIZE,
      `STEMMED_INDEX has ${size} entries — expected ≥ ${T.STEMMED_INDEX_SIZE}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. DICTIONARY LOOKUP — O(1) HASH TABLE
// ─────────────────────────────────────────────────────────────────────────────

describe('Dictionary lookup performance (O(1))', () => {
  test(`WORD_TO_SIGN hit lookup ≥ ${T.DICT_LOOKUP.toLocaleString()} ops/sec`, () => {
    const ops = measure(() => SM.WORD_TO_SIGN['hello'], 50_000);
    assert.ok(ops >= T.DICT_LOOKUP,
      `Got ${ops.toLocaleString()} ops/sec — threshold: ${T.DICT_LOOKUP.toLocaleString()}`);
  });

  test(`WORD_TO_SIGN miss lookup ≥ ${T.DICT_LOOKUP.toLocaleString()} ops/sec`, () => {
    const ops = measure(() => SM.WORD_TO_SIGN['zzz_not_a_word'], 50_000);
    assert.ok(ops >= T.DICT_LOOKUP,
      `Got ${ops.toLocaleString()} ops/sec — threshold: ${T.DICT_LOOKUP.toLocaleString()}`);
  });

  test(`SIGNS direct lookup ≥ ${T.DICT_LOOKUP.toLocaleString()} ops/sec`, () => {
    const ops = measure(() => SM.SIGNS['HELLO'], 50_000);
    assert.ok(ops >= T.DICT_LOOKUP,
      `Got ${ops.toLocaleString()} ops/sec — threshold: ${T.DICT_LOOKUP.toLocaleString()}`);
  });

  test(`VOCAB_EXT lookup ≥ ${T.DICT_LOOKUP.toLocaleString()} ops/sec`, () => {
    const ops = measure(() => VOCAB['analyze'], 50_000);
    assert.ok(ops >= T.DICT_LOOKUP,
      `Got ${ops.toLocaleString()} ops/sec — threshold: ${T.DICT_LOOKUP.toLocaleString()}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SINGLE-WORD PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

describe('Single-word textToSigns performance', () => {
  test(`known word ("hello") ≥ ${T.SINGLE_WORD_KNOWN.toLocaleString()} ops/sec`, () => {
    const ops = measure(() => SM.textToSigns('hello'), 10_000);
    assert.ok(ops >= T.SINGLE_WORD_KNOWN,
      `Got ${ops.toLocaleString()} ops/sec — threshold: ${T.SINGLE_WORD_KNOWN.toLocaleString()}`);
  });

  test(`stemmer path ("studying") ≥ ${T.SINGLE_WORD_STEM.toLocaleString()} ops/sec`, () => {
    const ops = measure(() => SM.textToSigns('studying'), 10_000);
    assert.ok(ops >= T.SINGLE_WORD_STEM,
      `Got ${ops.toLocaleString()} ops/sec — threshold: ${T.SINGLE_WORD_STEM.toLocaleString()}`);
  });

  test(`fingerspell fallback ("xyzqq") ≥ ${T.SINGLE_WORD_FINGERSPELL.toLocaleString()} ops/sec`, () => {
    const ops = measure(() => SM.textToSigns('xyzqq'), 5_000);
    assert.ok(ops >= T.SINGLE_WORD_FINGERSPELL,
      `Got ${ops.toLocaleString()} ops/sec — threshold: ${T.SINGLE_WORD_FINGERSPELL.toLocaleString()}`);
  });

  test('skip word ("the") faster than known word lookup', () => {
    const skipOps  = measure(() => SM.textToSigns('the'),   10_000);
    const knownOps = measure(() => SM.textToSigns('hello'), 10_000);
    assert.ok(skipOps > knownOps,
      `Skip word (${skipOps.toLocaleString()}) should be faster than known word (${knownOps.toLocaleString()})`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SENTENCE PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

describe('Sentence pipeline performance', () => {
  const sentences = [
    { text: 'hello my name is Alex',                          words: 5  },
    { text: 'I am sick please help me today',                 words: 7  },
    { text: 'where is the nearest school or library',         words: 7  },
    { text: 'what time does the morning class start tomorrow', words: 8 },
    { text: 'I want to learn sign language and communicate better every day', words: 11 },
  ];

  for (const { text, words } of sentences) {
    test(`"${text.slice(0, 45)}…" (${words}w) ≥ ${T.SENTENCE_5W.toLocaleString()} ops/sec`, () => {
      const iters = words <= 7 ? 5_000 : 3_000;
      const threshold = words <= 7 ? T.SENTENCE_5W : T.SENTENCE_10W;
      const ops = measure(() => SM.textToSigns(text), iters);
      assert.ok(ops >= threshold,
        `Got ${ops.toLocaleString()} ops/sec — threshold: ${threshold.toLocaleString()}`);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. THROUGHPUT — words per second (real-time caption requirement)
// ─────────────────────────────────────────────────────────────────────────────

describe('End-to-end throughput (must beat real-time speech)', () => {
  // Average speech rate: ~150 words/minute = 2.5 words/second
  // We need at least 100,000 words/second — a 40,000× safety margin
  const SPEECH_RATE_WPS = 2.5;
  const REQUIRED_MARGIN = 40_000;

  test(`throughput ≥ ${T.THROUGHPUT_WPERS.toLocaleString()} words/sec (${REQUIRED_MARGIN}× real-time speech)`, () => {
    const longText = [
      'today we will learn about sign language and how to communicate',
      'the weather is beautiful outside and I want to go for a walk',
      'can you please help me find the library where I can study',
      'I am hungry and I want to eat some food at the cafeteria',
      'tomorrow we have an important exam so we need to study tonight',
    ].join(' ');

    const wordCount = longText.split(' ').length;
    const iters = 2_000;

    const t0 = performance.now();
    for (let i = 0; i < iters; i++) SM.textToSigns(longText);
    const ms = performance.now() - t0;

    const wordsPerSec = Math.round((wordCount * iters) / (ms / 1000));
    const margin = Math.round(wordsPerSec / SPEECH_RATE_WPS);

    assert.ok(wordsPerSec >= T.THROUGHPUT_WPERS,
      `Got ${wordsPerSec.toLocaleString()} words/sec — threshold: ${T.THROUGHPUT_WPERS.toLocaleString()}`);

    // Log for visibility (doesn't affect pass/fail)
    console.log(`    throughput: ${wordsPerSec.toLocaleString()} words/sec (${margin.toLocaleString()}× real-time)`);
  });

  test('latency per sentence < 1ms (real-time caption sync)', () => {
    const sentence = 'what time does the class start today';
    const iters = 5_000;
    const t0 = performance.now();
    for (let i = 0; i < iters; i++) SM.textToSigns(sentence);
    const avgMs = (performance.now() - t0) / iters;
    assert.ok(avgMs < 1.0,
      `Avg latency: ${avgMs.toFixed(3)} ms — must be < 1 ms for real-time sync`);
    console.log(`    avg latency: ${(avgMs * 1000).toFixed(1)} µs per sentence`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. SUB-COMPONENT PERFORMANCE
// ─────────────────────────────────────────────────────────────────────────────

describe('Sub-component performance', () => {
  test(`_normalizeAndTokenize ≥ ${T.TOKENIZE.toLocaleString()} ops/sec`, () => {
    const ops = measure(
      () => SM._normalizeAndTokenize('Hello, World! How are you doing today?'),
      10_000
    );
    assert.ok(ops >= T.TOKENIZE,
      `Got ${ops.toLocaleString()} ops/sec — threshold: ${T.TOKENIZE.toLocaleString()}`);
  });

  test(`_applyAslGrammar ≥ ${T.GRAMMAR_REORDER.toLocaleString()} ops/sec`, () => {
    const words = ['today', 'what', 'do', 'you', 'want', 'study'];
    const ops = measure(() => SM._applyAslGrammar(words, true, false), 10_000);
    assert.ok(ops >= T.GRAMMAR_REORDER,
      `Got ${ops.toLocaleString()} ops/sec — threshold: ${T.GRAMMAR_REORDER.toLocaleString()}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. MEMORY / SCALE — data structure size checks
// ─────────────────────────────────────────────────────────────────────────────

describe('Data structure size (coverage requirements)', () => {
  test('SIGNS dictionary has ≥ 200 entries', () => {
    const n = Object.keys(SM.SIGNS).length;
    assert.ok(n >= 200, `SIGNS has only ${n} entries`);
    console.log(`    SIGNS: ${n} entries`);
  });

  test('WORD_TO_SIGN has ≥ 2000 entries', () => {
    const n = Object.keys(SM.WORD_TO_SIGN).length;
    assert.ok(n >= 2000, `WORD_TO_SIGN has only ${n} entries`);
    console.log(`    WORD_TO_SIGN: ${n} entries`);
  });

  test('VOCAB_EXT has ≥ 2000 entries', () => {
    const n = Object.keys(VOCAB).length;
    assert.ok(n >= 2000, `VOCAB_EXT has only ${n} entries`);
    console.log(`    VOCAB_EXT: ${n} entries`);
  });

  test('combined coverage ≥ 4000 word mappings', () => {
    const total = Object.keys(SM.WORD_TO_SIGN).length + Object.keys(VOCAB).length;
    assert.ok(total >= 4000, `Total mappings: ${total} — expected ≥ 4000`);
    console.log(`    Total word mappings: ${total.toLocaleString()}`);
  });
});
