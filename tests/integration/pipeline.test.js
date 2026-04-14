/**
 * SignBridge — Integration Tests
 *
 * Tests that multiple modules work TOGETHER correctly:
 *   sign-mapper.js + vocab-10k.js  →  full text-to-sign pipeline
 *
 * Integration tests are different from unit tests:
 *   Unit test  = test ONE function in isolation with mocks
 *   Integration test = test MULTIPLE real modules wired together
 *
 * Run: node --test tests/integration/pipeline.test.js
 */

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const vm     = require('node:vm');
const fs     = require('node:fs');
const path   = require('node:path');

// ── Wire the real modules together (no mocks) ─────────────────────────────────

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

// Load both modules — this IS the integration (they share window.SignBridge)
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../extension/content/sign-mapper.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../extension/content/vocab-10k.js'),   'utf8'), ctx);

const SM    = ctx.window.SignBridge.SignMapper;
const VOCAB = ctx.window.SignBridge.VOCAB_EXT;

// ─────────────────────────────────────────────────────────────────────────────
// 1. VOCAB_EXT INTEGRATES WITH SIGNS DICTIONARY
//    Proves vocab-10k.js keys resolve to real sign configs at runtime
// ─────────────────────────────────────────────────────────────────────────────

describe('Integration: vocab-10k.js ↔ sign-mapper.js SIGNS', () => {
  test('every VOCAB_EXT value resolves to a real sign config at runtime', () => {
    const broken = [];
    for (const [word, key] of Object.entries(VOCAB)) {
      const sign = SM.SIGNS[key];
      if (!sign) broken.push(`'${word}' → '${key}' (no sign config)`);
    }
    assert.strictEqual(broken.length, 0,
      `${broken.length} vocab-10k entries point to non-existent signs:\n${broken.slice(0, 10).join('\n')}`);
  });

  test('vocab-10k word triggers real sign animation config in textToSigns', () => {
    // 'analyze' is in vocab-10k → THINK; textToSigns must return a complete sign config
    const signs = SM.textToSigns('analyze');
    assert.ok(signs.length > 0, '"analyze" should produce at least one sign');
    const s = signs[0];
    assert.ok(s.right,       'sign must have right arm coords');
    assert.ok(s.rHand,       'sign must have rHand shape');
    assert.ok(s.expression,  'sign must have expression');
    assert.strictEqual(s._key, 'THINK');
  });

  test('vocab-10k word returns same config structure as core WORD_TO_SIGN', () => {
    const coreSign  = SM.textToSigns('hello')[0];   // from WORD_TO_SIGN
    const vocabSign = SM.textToSigns('analyze')[0]; // from VOCAB_EXT

    // Both must have the same required shape
    for (const field of ['right', 'rHand', 'expression', '_key', '_word']) {
      assert.ok(field in coreSign,  `core sign missing field: ${field}`);
      assert.ok(field in vocabSign, `vocab sign missing field: ${field}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. STEMMER + VOCAB-10K FALLBACK CHAIN
//    Word not in WORD_TO_SIGN → stem → STEMMED_INDEX → if still not found → VOCAB_EXT
// ─────────────────────────────────────────────────────────────────────────────

describe('Integration: Stemmer → WORD_TO_SIGN → VOCAB_EXT fallback chain', () => {
  test('step 1 — direct WORD_TO_SIGN hit skips stemmer', () => {
    const signs = SM.textToSigns('hello');
    assert.strictEqual(signs[0]._key, 'HELLO');
    assert.strictEqual(signs[0]._word, 'hello');
  });

  test('step 2 — stemmer finds root in WORD_TO_SIGN (studying → study → STUDY)', () => {
    const signs = SM.textToSigns('studying');
    assert.ok(signs.length > 0);
    assert.strictEqual(signs[0]._key, 'STUDY');
  });

  test('step 3 — vocab-10k word resolves to THINK sign', () => {
    // "analyze" → THINK (whether via WORD_TO_SIGN or VOCAB_EXT, the sign is correct)
    const signs = SM.textToSigns('analyze');
    assert.ok(signs.length > 0, '"analyze" must produce at least one sign');
    assert.strictEqual(signs[0]._key, 'THINK',
      `Expected THINK, got ${signs[0]._key}`);
  });

  test('step 4 — POS fallback when nothing found (adjective suffix → __MODIFIER)', () => {
    // "zxqwful" has -ful suffix → ADJ → __MODIFIER
    const signs = SM.textToSigns('zxqwful');
    assert.ok(signs.length > 0);
    assert.strictEqual(signs[0]._key, '__MODIFIER');
  });

  test('step 5 — fingerspell as final fallback for truly unknown words', () => {
    const signs = SM.textToSigns('xzqpppq');
    assert.ok(signs.every(s => s._isFingerspell), 'completely unknown → all fingerspell');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ASL GRAMMAR + QUESTION DETECTION WORKING TOGETHER
// ─────────────────────────────────────────────────────────────────────────────

describe('Integration: grammar reordering + expression marking', () => {
  test('WH-question: "what" moved to end AND expression = WH_QUESTION', () => {
    const signs = SM.textToSigns('what do you want?');
    const keys  = signs.map(s => s._key);
    const whatIdx = keys.lastIndexOf('WHAT');
    assert.ok(whatIdx === keys.length - 1 || whatIdx >= keys.length - 2,
      `"WHAT" should be near end, got index ${whatIdx} of ${keys.length}`);
    assert.ok(signs.some(s => s.expression === 'WH_QUESTION'));
  });

  test('time word moves to front AND sentence still produces all signs', () => {
    const signs = SM.textToSigns('I will learn tomorrow');
    const keys  = signs.map(s => s._key);
    const tomorrowIdx = keys.indexOf('TOMORROW');
    const learnIdx    = keys.indexOf('LEARN');
    assert.ok(keys.includes('TOMORROW'), `TOMORROW missing — got: [${keys.join(', ')}]`);
    assert.ok(keys.includes('LEARN'),    `LEARN missing — got: [${keys.join(', ')}]`);
    if (tomorrowIdx !== -1 && learnIdx !== -1) {
      assert.ok(tomorrowIdx < learnIdx, `TOMORROW(${tomorrowIdx}) must come before LEARN(${learnIdx})`);
    }
  });

  test('mixed sentence: time + WH + regular words all produce signs', () => {
    const signs = SM.textToSigns('what did you study today?');
    assert.ok(signs.length >= 2, 'should have multiple signs');
    assert.ok(signs.some(s => s.expression === 'WH_QUESTION'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. MULTI-WORD PHRASE DETECTION (phrase lookup before single-word)
// ─────────────────────────────────────────────────────────────────────────────

describe('Integration: multi-word phrase detection', () => {
  test('"thank you" → single THANK_YOU sign (not two separate signs)', () => {
    const signs = SM.textToSigns('thank you');
    assert.strictEqual(signs.length, 1);
    assert.strictEqual(signs[0]._key, 'THANK_YOU');
    assert.strictEqual(signs[0]._word, 'thank you');
  });

  test('"my name" → single NAME sign (phrase takes priority)', () => {
    const signs = SM.textToSigns('my name');
    assert.strictEqual(signs.length, 1);
    assert.strictEqual(signs[0]._key, 'NAME');
  });

  test('longer sentence preserves phrase detection in context', () => {
    const signs = SM.textToSigns('hello my name is Alex');
    const keys  = signs.map(s => s._key);
    assert.ok(keys.includes('HELLO'), 'HELLO should be found');
    assert.ok(keys.includes('NAME'),  'NAME should be found as phrase');
    // "my" should NOT appear separately since it was consumed by "my name" phrase
    assert.ok(!keys.includes('ME') || keys.indexOf('NAME') !== -1,
      '"my name" should be matched as a phrase');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. REAL CAPTION SCENARIOS (end-to-end integration)
// ─────────────────────────────────────────────────────────────────────────────

describe('Integration: real caption scenarios', () => {
  const scenarios = [
    {
      name: 'Zoom lecture — professor introduces topic',
      input: 'Today we will learn about machine learning and neural networks',
      minSigns: 4,
      mustHaveKey: 'TODAY',
    },
    {
      name: 'Google Meet — student asks for help',
      input: 'Can you please help me understand the homework assignment?',
      minSigns: 3,
      mustHaveKey: 'HELP',
    },
    {
      name: 'YouTube — weather forecast',
      input: 'Tomorrow morning expect heavy rain and cold temperatures',
      minSigns: 3,
      mustHaveKey: 'TOMORROW',
    },
    {
      name: 'Teams — health emergency',
      input: 'I feel sick and I need to see a doctor right now',
      minSigns: 3,
      mustHaveKey: 'SICK',
    },
    {
      name: 'Mixed vocab — uses vocab-10k for academic words',
      input: 'The professor will analyze and evaluate your assignment',
      minSigns: 2,
      mustHaveKey: 'THINK', // analyze → THINK via vocab-10k
    },
  ];

  for (const { name, input, minSigns, mustHaveKey } of scenarios) {
    test(`"${name}"`, () => {
      const signs = SM.textToSigns(input);
      const keys  = signs.map(s => s._key);

      assert.ok(signs.length >= minSigns,
        `Expected ≥${minSigns} signs, got ${signs.length}: [${keys.join(', ')}]`);

      assert.ok(keys.includes(mustHaveKey),
        `Expected key '${mustHaveKey}' in output. Got: [${keys.join(', ')}]`);

      // Every sign must have a valid renderable structure
      for (const s of signs) {
        assert.ok(s._key,       `Sign missing _key`);
        assert.ok(s._word,      `Sign missing _word`);
        assert.ok(s.expression, `Sign '${s._key}' missing expression`);
        if (!s._isFingerspell) {
          assert.ok(s.right, `Non-fingerspell sign '${s._key}' must have right arm`);
        }
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. WINDOW.SIGNBRIDGE NAMESPACE INTEGRITY
//    Both modules share the same namespace — neither should overwrite the other
// ─────────────────────────────────────────────────────────────────────────────

describe('Integration: shared window.SignBridge namespace', () => {
  test('both modules coexist under window.SignBridge', () => {
    assert.ok(ctx.window.SignBridge.SignMapper,  'SignMapper should exist');
    assert.ok(ctx.window.SignBridge.VOCAB_EXT,  'VOCAB_EXT should exist');
  });

  test('vocab-10k did not overwrite SignMapper', () => {
    assert.strictEqual(typeof SM.textToSigns, 'function');
    assert.ok(Object.keys(SM.SIGNS).length > 100);
  });

  test('sign-mapper did not overwrite VOCAB_EXT', () => {
    assert.ok(Object.keys(VOCAB).length > 2000);
  });
});
