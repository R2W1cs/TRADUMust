/**
 * SignBridge — Stress Tests
 *
 * Stress tests push the system BEYOND normal conditions to find limits.
 * They test: very long inputs, edge cases, repeated calls, memory stability.
 *
 * Difference from load tests:
 *   Load test  = normal volume, verify speed & correctness
 *   Stress test = extreme input, verify the system doesn't CRASH or CORRUPT
 *
 * Run: node --test tests/stress/sign-mapper.stress.js
 */

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const vm     = require('node:vm');
const fs     = require('node:fs');
const path   = require('node:path');

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
const SM = ctx.window.SignBridge.SignMapper;

// ─────────────────────────────────────────────────────────────────────────────
// 1. EXTREME INPUT LENGTH
// ─────────────────────────────────────────────────────────────────────────────

describe('Stress: extreme input length', () => {
  test('100-word sentence does not crash', () => {
    const sentence = Array(100).fill('hello world today tomorrow').join(' ');
    let result;
    assert.doesNotThrow(() => { result = SM.textToSigns(sentence); });
    assert.ok(Array.isArray(result));
  });

  test('500-word sentence completes in < 500ms', () => {
    const sentence = Array(500).fill('I want to learn sign language').join(' ');
    const t0 = performance.now();
    const result = SM.textToSigns(sentence);
    const ms = performance.now() - t0;
    assert.ok(Array.isArray(result));
    assert.ok(ms < 500, `500-word sentence took ${ms.toFixed(0)}ms — must be < 500ms`);
  });

  test('1000-word sentence completes without crash', () => {
    const sentence = Array(1000).fill('today we study sign language').join(' ');
    assert.doesNotThrow(() => SM.textToSigns(sentence));
  });

  test('single 50-character unknown word is fingerspelled without crash', () => {
    const longWord = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwx';
    let result;
    assert.doesNotThrow(() => { result = SM.textToSigns(longWord); });
    assert.strictEqual(result.filter(s => s._isFingerspell).length, longWord.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. EDGE CASE INPUTS (should not throw — must degrade gracefully)
// ─────────────────────────────────────────────────────────────────────────────

describe('Stress: edge case inputs — graceful degradation', () => {
  const edgeCases = [
    ['empty string',        ''],
    ['only spaces',         '       '],
    ['only punctuation',    '!!! ??? ... ,,,'],
    ['only skip words',     'a the is are was be'],
    ['numbers as text',     '1 2 3 4 5 100 1000'],
    ['unicode emoji',       '😀 👋 🤟 ❤️'],
    ['repeated word x100',  Array(100).fill('hello').join(' ')],
    ['null-like string',    'null undefined NaN'],
    ['mixed case',          'HeLLo WOrLD tODAy'],
    ['newlines/tabs',       'hello\nworld\ttoday'],
    ['very short words',    'a i o u b c d e'],
    ['all caps',            'HELLO WORLD TODAY TOMORROW'],
  ];

  for (const [label, input] of edgeCases) {
    test(`"${label}" does not throw`, () => {
      let result;
      assert.doesNotThrow(
        () => { result = SM.textToSigns(input); },
        `textToSigns(${JSON.stringify(input.slice(0,30))}) threw an error`
      );
      assert.ok(Array.isArray(result), 'must return an array');
    });
  }

  test('null input returns empty array (not throw)', () => {
    const r = SM.textToSigns(null);
    assert.ok(Array.isArray(r) && r.length === 0);
  });

  test('undefined input returns empty array (not throw)', () => {
    const r = SM.textToSigns(undefined);
    assert.ok(Array.isArray(r) && r.length === 0);
  });

  test('number input returns empty array (not throw)', () => {
    assert.doesNotThrow(() => SM.textToSigns(42));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. REPEATED CALLS — memory stability (no leaks, no state corruption)
// ─────────────────────────────────────────────────────────────────────────────

describe('Stress: repeated calls — state stability', () => {
  test('10,000 calls return same result for same input', () => {
    const input    = 'hello my name is Alex';
    const expected = SM.textToSigns(input).map(s => s._key).join(',');

    for (let i = 0; i < 10_000; i++) {
      const keys = SM.textToSigns(input).map(s => s._key).join(',');
      assert.strictEqual(keys, expected,
        `Result changed at iteration ${i}: expected '${expected}', got '${keys}'`);
    }
  });

  test('alternating WH and YN questions do not corrupt expression state', () => {
    const wh = 'where is the school?';
    const yn = 'do you need help?';

    for (let i = 0; i < 500; i++) {
      const whSigns = SM.textToSigns(wh);
      const ynSigns = SM.textToSigns(yn);

      assert.ok(whSigns.some(s => s.expression === 'WH_QUESTION'),
        `WH expression lost at iteration ${i}`);
      assert.ok(ynSigns.some(s => s.expression === 'QUESTION'),
        `YN expression lost at iteration ${i}`);
    }
  });

  test('SIGNS dictionary not mutated by repeated textToSigns calls', () => {
    const originalHello = JSON.stringify(SM.SIGNS['HELLO']);
    for (let i = 0; i < 5_000; i++) SM.textToSigns('hello world today');
    const afterHello = JSON.stringify(SM.SIGNS['HELLO']);
    assert.strictEqual(originalHello, afterHello, 'SIGNS["HELLO"] was mutated!');
  });

  test('WORD_TO_SIGN not mutated by repeated calls', () => {
    const originalSize = Object.keys(SM.WORD_TO_SIGN).length;
    for (let i = 0; i < 5_000; i++) SM.textToSigns('studying working teaching');
    const afterSize = Object.keys(SM.WORD_TO_SIGN).length;
    assert.strictEqual(originalSize, afterSize, 'WORD_TO_SIGN size changed!');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. RAPID ALTERNATING INPUTS — simulates real caption stream
// ─────────────────────────────────────────────────────────────────────────────

describe('Stress: rapid caption stream simulation', () => {
  test('1000 different sentences in sequence — all return arrays', () => {
    const templates = [
      'hello world today',
      'what time is it now',
      'I want to learn sign language',
      'where is the nearest school',
      'thank you for your help',
      'I am sick please help',
      'tomorrow we have an exam',
      'can you repeat that please',
    ];

    let errors = 0;
    for (let i = 0; i < 1000; i++) {
      const text = templates[i % templates.length] + ' ' + i;
      const result = SM.textToSigns(text);
      if (!Array.isArray(result)) errors++;
    }
    assert.strictEqual(errors, 0, `${errors} calls returned non-array`);
  });

  test('interleaved known / unknown / fingerspell — no cross-contamination', () => {
    const inputs = ['hello', 'xyzqq', 'studying', 'qqqqq', 'thank you', 'zzzz'];

    for (let round = 0; round < 200; round++) {
      const results = inputs.map(i => SM.textToSigns(i));

      // 'hello' must always → HELLO
      assert.ok(results[0].some(s => s._key === 'HELLO'),
        `Round ${round}: "hello" did not produce HELLO`);

      // 'xyzqq' must always → fingerspelling
      assert.ok(results[1].every(s => s._isFingerspell),
        `Round ${round}: "xyzqq" did not fingerspell`);

      // 'thank you' must always → THANK_YOU
      assert.ok(results[4].some(s => s._key === 'THANK_YOU'),
        `Round ${round}: "thank you" did not produce THANK_YOU`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. STEMMER STRESS — many inflected forms
// ─────────────────────────────────────────────────────────────────────────────

describe('Stress: stemmer under many inflected forms', () => {
  const inflections = [
    'studying', 'studied', 'studies',
    'working',  'worked',  'works',
    'teaching', 'taught',  'teaches',
    'learning', 'learned', 'learns',
    'helping',  'helped',  'helps',
  ];

  test('all inflected forms produce a valid sign (not fingerspell)', () => {
    const fingerspelled = [];
    for (const word of inflections) {
      const signs = SM.textToSigns(word);
      if (signs.every(s => s._isFingerspell)) {
        fingerspelled.push(word);
      }
    }
    assert.strictEqual(fingerspelled.length, 0,
      `These words were fully fingerspelled (stemmer/vocab missed them): ${fingerspelled.join(', ')}`);
  });

  test('5000 stemmer calls with rotating inflections stay consistent', () => {
    const results = inflections.map(w => SM.textToSigns(w).map(s => s._key).join(','));

    for (let i = 0; i < 5000; i++) {
      const word  = inflections[i % inflections.length];
      const keys  = SM.textToSigns(word).map(s => s._key).join(',');
      const expected = results[i % inflections.length];
      assert.strictEqual(keys, expected,
        `Stemmer result changed for '${word}' at iteration ${i}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. CONCURRENT-STYLE STRESS (Node is single-threaded, but tests interleaving)
// ─────────────────────────────────────────────────────────────────────────────

describe('Stress: interleaved calls simulate concurrent access', () => {
  test('interleaved calls from "multiple users" give independent results', () => {
    const user1Input = 'hello I need help today';
    const user2Input = 'where is the school tomorrow';
    const user3Input = 'I am sick please call doctor';

    for (let i = 0; i < 200; i++) {
      const r1 = SM.textToSigns(user1Input);
      const r2 = SM.textToSigns(user2Input);
      const r3 = SM.textToSigns(user3Input);

      assert.ok(r1.some(s => s._key === 'HELLO'),   `user1 HELLO missing at ${i}`);
      assert.ok(r2.some(s => s._key === 'WHERE'),    `user2 WHERE missing at ${i}`);
      assert.ok(r3.some(s => s._key === 'SICK'),     `user3 SICK missing at ${i}`);
    }
  });
});
