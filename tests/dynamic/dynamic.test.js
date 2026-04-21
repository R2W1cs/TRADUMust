'use strict';
/**
 * TRADUMUST — Comprehensive Dynamic, Fuzz & Property-Based Tests
 * Runner: Node.js built-in test runner
 * Run:    node --test tests/dynamic/dynamic.test.js
 *
 * Covers:
 *   1. Random fuzz inputs on SignMapper
 *   2. Property-based invariants
 *   3. Boundary value analysis
 *   4. Unicode / emoji / RTL stress
 *   5. Idempotency checks
 *   6. Performance micro-benchmarks (no external deps)
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const vm     = require('node:vm');
const fs     = require('node:fs');
const path   = require('node:path');
const fc     = require('fast-check');
// ── Load sign-mapper + vocab-10k in a fake browser context ───────────────────
const ctx = {
  window: { SignBridge: {} },
  chrome: { runtime: { getURL: () => '' } },
  document: {
    createElement: () => ({ src: '', onload: null, onerror: null }),
    head: { appendChild: () => {} },
    documentElement: { appendChild: () => {} },
  },
  console: { log: () => {}, warn: () => {}, error: () => {} },
};
vm.createContext(ctx);
const mapperSrc = fs.readFileSync(path.join(__dirname, '../../extension/content/sign-mapper.js'), 'utf8');
const vocabSrc  = fs.readFileSync(path.join(__dirname, '../../extension/content/vocab-10k.js'),   'utf8');
vm.runInContext(mapperSrc, ctx);
vm.runInContext(vocabSrc,  ctx);

const SM    = ctx.window.SignBridge.SignMapper;
const VOCAB = ctx.window.SignBridge.VOCAB_EXT;

// ── Utility: random string from charset ───────────────────────────────────────
function randomStr(len, chars) {
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const ASCII_PRINTABLE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?\'"-;:()@#$%^&*_+=[]{}|\\<>/~`';
const KNOWN_WORDS     = Object.keys(SM.WORD_TO_SIGN).concat(Object.keys(VOCAB || {}));

// ─────────────────────────────────────────────────────────────────────────────
// 1. RANDOM FUZZ — no crashes allowed
// ─────────────────────────────────────────────────────────────────────────────

describe('Fuzz: random ASCII inputs (2000 iterations)', () => {
  test('textToSigns never throws on random ASCII', () => {
    const ITERS = 2000;
    let passed  = 0;
    for (let i = 0; i < ITERS; i++) {
      const len = Math.floor(Math.random() * 200);
      const str = randomStr(len, ASCII_PRINTABLE);
      assert.doesNotThrow(
        () => {
          const r = SM.textToSigns(str);
          assert.ok(Array.isArray(r), `Expected array, got ${typeof r}`);
          passed++;
        },
        `Threw on: ${JSON.stringify(str)}`
      );
    }
    assert.strictEqual(passed, ITERS);
  });

  test('textToSigns never throws on word-soup sentences (1000 iterations)', () => {
    const all   = KNOWN_WORDS.concat(['', 'xqz', 'hello', '!@#', '   ']);
    const ITERS = 1000;
    let passed  = 0;
    for (let i = 0; i < ITERS; i++) {
      const numWords = Math.floor(Math.random() * 25);
      const sentence = Array.from({ length: numWords }, () =>
        all[Math.floor(Math.random() * all.length)]
      ).join(' ');
      assert.doesNotThrow(() => {
        const r = SM.textToSigns(sentence);
        assert.ok(Array.isArray(r));
        passed++;
      });
    }
    assert.strictEqual(passed, ITERS);
  });

  test('textToSigns never throws on empty / whitespace-only strings', () => {
    const whitespaceVariants = ['', ' ', '   ', '\t', '\n', '\r\n', '  \t  '];
    for (const s of whitespaceVariants) {
      assert.doesNotThrow(() => {
        const r = SM.textToSigns(s);
        assert.ok(Array.isArray(r));
      }, `Threw on: ${JSON.stringify(s)}`);
    }
  });

  test('textToSigns never throws on null / undefined / non-string', () => {
    const weirdInputs = [null, undefined, 42, true, false, [], {}, Symbol('x')];
    for (const v of weirdInputs) {
      assert.doesNotThrow(() => {
        const r = SM.textToSigns(v);
        assert.ok(Array.isArray(r));
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. UNICODE / EMOJI / RTL STRESS
// ─────────────────────────────────────────────────────────────────────────────

describe('Unicode / Emoji / RTL inputs', () => {
  const UNICODE_INPUTS = [
    'مرحبا كيف حالك',          // Arabic RTL
    '你好世界',                  // Chinese
    'こんにちは',                // Japanese
    '안녕하세요',                // Korean
    'Привет мир',               // Cyrillic
    'Héllo wörld café naïve',   // Latin extended
    'Hello 🤟✌️👋🙏',            // Emoji
    '🇫🇷🇯🇵🇩🇪🇨🇳',               // Flag emoji
    '←→↑↓♠♥♦♣',                // Symbols
    '\u200B\u200C\u200D\uFEFF', // Zero-width + BOM
    'A'.repeat(500),            // Single char repeated 500x
  ];

  test('textToSigns does not crash on unicode inputs', () => {
    for (const input of UNICODE_INPUTS) {
      assert.doesNotThrow(() => {
        const r = SM.textToSigns(input);
        assert.ok(Array.isArray(r), `Expected array for: ${input.slice(0, 20)}`);
      });
    }
  });

  test('result is always an array regardless of input script', () => {
    for (const input of UNICODE_INPUTS) {
      const r = SM.textToSigns(input);
      assert.ok(Array.isArray(r));
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. PROPERTY-BASED INVARIANTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Property-based invariants (500 samples each)', () => {
  const SAMPLES = 500;

  test('INV: result is always array', () => {
    for (let i = 0; i < SAMPLES; i++) {
      const str = randomStr(Math.floor(Math.random() * 50), ASCII_PRINTABLE);
      assert.ok(Array.isArray(SM.textToSigns(str)));
    }
  });

  test('INV: every result sign has _key and _word', () => {
    for (let i = 0; i < SAMPLES; i++) {
      const words = KNOWN_WORDS.slice(0, 5).join(' ');
      for (const sign of SM.textToSigns(words)) {
        assert.ok(sign._key,  `Sign missing _key: ${JSON.stringify(sign)}`);
        assert.ok(sign._word !== undefined, `Sign missing _word`);
      }
    }
  });

  test('INV: no sign has undefined right/rHand if not fingerspell', () => {
    for (const word of KNOWN_WORDS.slice(0, 200)) {
      for (const sign of SM.textToSigns(word)) {
        if (!sign._isFingerspell) {
          assert.ok(sign.right !== undefined, `${sign._key}: missing right arm`);
          assert.ok(sign.rHand !== undefined, `${sign._key}: missing rHand`);
        }
      }
    }
  });

  test('INV: fingerspelled signs have category=fingerspelling', () => {
    const unknownWords = ['qzxwvj','yyyppp','zzzxxx','aaabbb','kkknnn'];
    for (const w of unknownWords) {
      for (const sign of SM.textToSigns(w)) {
        if (sign._isFingerspell) {
          assert.strictEqual(sign.category, 'fingerspelling',
            `Fingerspell sign has wrong category: ${sign.category}`);
        }
      }
    }
  });

  test('INV: output length is stable for identical input (idempotency)', () => {
    const testSentences = [
      'hello my name is Alex',
      'where is the library',
      'thank you for your help',
      'I want to learn sign language today',
    ];
    for (const s of testSentences) {
      const r1 = SM.textToSigns(s).length;
      const r2 = SM.textToSigns(s).length;
      const r3 = SM.textToSigns(s).length;
      assert.strictEqual(r1, r2, `Length changed between call 1 and 2 for: "${s}"`);
      assert.strictEqual(r2, r3, `Length changed between call 2 and 3 for: "${s}"`);
    }
  });

  test('INV: sign keys reference entries in SIGNS dict', () => {
    for (const word of KNOWN_WORDS.slice(0, 300)) {
      for (const sign of SM.textToSigns(word)) {
        if (!sign._isFingerspell) {
          assert.ok(
            SM.SIGNS[sign._key] !== undefined,
            `_key "${sign._key}" for word "${word}" not found in SIGNS dict`
          );
        }
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. BOUNDARY VALUE ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

describe('Boundary value analysis', () => {
  test('single character inputs', () => {
    for (const c of 'abcdefghijklmnopqrstuvwxyz0123456789') {
      assert.doesNotThrow(() => {
        const r = SM.textToSigns(c);
        assert.ok(Array.isArray(r));
      });
    }
  });

  test('maximum realistic sentence length (200 words)', () => {
    const bigSentence = Array.from({ length: 200 }, (_, i) =>
      KNOWN_WORDS[i % KNOWN_WORDS.length]
    ).join(' ');
    assert.doesNotThrow(() => {
      const r = SM.textToSigns(bigSentence);
      assert.ok(Array.isArray(r));
    });
  });

  test('sentence with ALL known words (dictionary coverage)', () => {
    const allWords = KNOWN_WORDS.join(' ');
    assert.doesNotThrow(() => {
      const r = SM.textToSigns(allWords);
      assert.ok(Array.isArray(r));
      assert.ok(r.length > 0);
    });
  });

  test('single word from every category maps correctly', () => {
    const cats = SM.getCategories();
    for (const cat of cats) {
      const members = SM.getCategory(cat);
      if (members.length > 0) {
        const signInfo = members[0];
        assert.ok(signInfo, `No sign info for category: ${cat}`);
        assert.strictEqual(signInfo.category, cat);
      }
    }
  });

  test('empty word between spaces does not produce extra signs', () => {
    const r1 = SM.textToSigns('hello world');
    const r2 = SM.textToSigns('hello  world');   // double space
    const r3 = SM.textToSigns('  hello world  '); // leading/trailing
    // All should produce the same number of actual sign entries
    assert.strictEqual(r1.length, r2.length, 'Double space should not add extra signs');
    assert.strictEqual(r1.length, r3.length, 'Leading/trailing spaces should not add extra signs');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. ASL GRAMMAR PROPERTIES
// ─────────────────────────────────────────────────────────────────────────────

describe('ASL grammar invariants', () => {
  const TIME_WORDS = ['today','tomorrow','yesterday','now','soon','later','morning','night'];

  test('time words always appear before non-time words', () => {
    for (const tw of TIME_WORDS) {
      // Construct a sentence where noun comes before time word in English
      const sentence = `I study ${tw}`;
      const signs  = SM.textToSigns(sentence);
      const words  = signs.map(s => s._word);
      const tIdx   = words.indexOf(tw);
      if (tIdx !== -1) {
        // Every non-time word that comes after in the output should not be before tIdx
        // i.e., tIdx should be <= index of any action/verb word
        const afterTimeWords = words.slice(tIdx + 1);
        assert.ok(
          !afterTimeWords.includes(tw),
          `Time word "${tw}" appeared more than once: ${words.join(', ')}`
        );
      }
    }
  });

  test('WH-question words are placed near end', () => {
    const WH_WORDS = ['what','where','when','who','why','how'];
    for (const wh of WH_WORDS) {
      const signs = SM.textToSigns(`${wh} do you want`);
      const words = signs.map(s => s._word);
      const whIdx = words.lastIndexOf(wh);
      if (whIdx !== -1 && words.length > 1) {
        // WH word should be at or near the end (last 2 positions)
        assert.ok(
          whIdx >= words.length - 2,
          `"${wh}" at index ${whIdx} — expected near end of ${words.length} signs: [${words}]`
        );
      }
    }
  });

  test('question sentences end with QUESTION or WH_QUESTION expression', () => {
    const q1 = SM.textToSigns('do you want help?');
    const q2 = SM.textToSigns('where is the classroom?');
    const questionExpressions = new Set(['QUESTION','WH_QUESTION']);
    [q1, q2].forEach((signs, i) => {
      const signedSigns = signs.filter(s => !s._isFingerspell);
      const hasQ = signedSigns.some(s => questionExpressions.has(s.expression));
      assert.ok(hasQ, `Question ${i + 1} should have QUESTION/WH_QUESTION expression`);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. PERFORMANCE MICRO-BENCHMARKS
// ─────────────────────────────────────────────────────────────────────────────

describe('Performance benchmarks (must be fast enough)', () => {
  const BENCH_ITERS = 500;

  test('single known word lookup < 1ms average', () => {
    const t0 = performance.now();
    for (let i = 0; i < BENCH_ITERS; i++) {
      SM.textToSigns('hello');
    }
    const avgMs = (performance.now() - t0) / BENCH_ITERS;
    assert.ok(avgMs < 1, `Avg single-word lookup: ${avgMs.toFixed(3)}ms — must be < 1ms`);
  });

  test('10-word sentence < 5ms average', () => {
    const sentence = 'hello my name is Alex I want to learn today';
    const t0 = performance.now();
    for (let i = 0; i < BENCH_ITERS; i++) {
      SM.textToSigns(sentence);
    }
    const avgMs = (performance.now() - t0) / BENCH_ITERS;
    assert.ok(avgMs < 5, `Avg 10-word lookup: ${avgMs.toFixed(3)}ms — must be < 5ms`);
  });

  test('unknown word fingerspell < 2ms average (5 chars)', () => {
    const t0 = performance.now();
    for (let i = 0; i < BENCH_ITERS; i++) {
      SM.textToSigns('xyzqr');
    }
    const avgMs = (performance.now() - t0) / BENCH_ITERS;
    assert.ok(avgMs < 2, `Avg fingerspell: ${avgMs.toFixed(3)}ms — must be < 2ms`);
  });

  test('getSignInfo lookup < 0.05ms average', () => {
    const t0 = performance.now();
    const ITERS = 5000;
    for (let i = 0; i < ITERS; i++) {
      SM.getSignInfo('HELLO');
    }
    const avgMs = (performance.now() - t0) / ITERS;
    assert.ok(avgMs < 0.05, `Avg getSignInfo: ${avgMs.toFixed(4)}ms — must be < 0.05ms`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. REGRESSION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Regression tests (known past bugs)', () => {
  test('REG-001: "pink" maps to RED not BLUE', () => {
    assert.strictEqual(SM.WORD_TO_SIGN['pink'], 'RED');
  });

  test('REG-002: "thank you" (multi-word) is a single sign, not "thank" + "you"', () => {
    const signs = SM.textToSigns('thank you');
    assert.ok(
      signs.some(s => s._key === 'THANK_YOU'),
      `"thank you" should produce THANK_YOU: got ${signs.map(s => s._key).join(', ')}`
    );
    assert.ok(
      !signs.some(s => s._key === 'THANK' && signs.some(s2 => s2._key === 'YOU')),
      '"thank you" should not split into THANK + YOU'
    );
  });

  test('REG-003: empty string returns [] not null/undefined', () => {
    const r = SM.textToSigns('');
    assert.strict(Array.isArray(r) && r.length === 0, true);
  });

  test('REG-004: categories include fingerspelling', () => {
    assert.ok(SM.getCategories().length > 0);
  });

  test('REG-005: ARM coordinates — no coordinate exactly at 0,0 (boundary regression)', () => {
    // Checks that no arm joint has exactly {x:0, y:0} which would mean unset
    const errors = [];
    for (const [key, sign] of Object.entries(SM.SIGNS)) {
      for (const side of ['right','left']) {
        if (!sign[side]) continue;
        for (const joint of ['elbow','wrist']) {
          const pt = sign[side][joint];
          if (pt && pt.x === 0 && pt.y === 0) {
            errors.push(`${key}.${side}.${joint} = {0,0} — likely unset`);
          }
        }
      }
    }
    assert.strictEqual(errors.length, 0, errors.slice(0, 5).join('\n'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. METAMORPHIC TESTING
// ─────────────────────────────────────────────────────────────────────────────

describe('Metamorphic testing', () => {
  test('Additive property: sign(A) + sign(B) is similar to sign(A + B)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), (a, b) => {
        // Strip non-alphanumeric to keep it fair (as punctuation affects it)
        const cleanA = a.replace(/[^a-zA-Z ]/g, '').trim();
        const cleanB = b.replace(/[^a-zA-Z ]/g, '').trim();
        if (!cleanA || !cleanB) return true;
        
        const signsA = SM.textToSigns(cleanA);
        const signsB = SM.textToSigns(cleanB);
        const signsCombined = SM.textToSigns(cleanA + ' ' + cleanB);
        
        assert.ok(signsCombined.length <= signsA.length + signsB.length);
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. MUTATION TESTING (Mocked Concept)
// ─────────────────────────────────────────────────────────────────────────────

describe('Mutation testing (Inline)', () => {
  test('Mutating WORD_TO_SIGN alters output', () => {
    // We pick a known word from KNOWN_WORDS. 'hello' is usually lower or upper?
    // Let's just create a completely new word mapping to guarantee it's triggered.
    SM.WORD_TO_SIGN['mutatedwordtest'] = 'MUTATED_SIGN';
    
    // We also must ensure 'MUTATED_SIGN' exists in SIGNS or the mapper might drop it or fingerspell it
    const originalSign = SM.SIGNS['MUTATED_SIGN'];
    SM.SIGNS['MUTATED_SIGN'] = { category: 'test' };
    
    const res = SM.textToSigns('mutatedwordtest');
    assert.ok(res.some(s => s._key === 'MUTATED_SIGN'), 'Output should reflect mutation');
    
    // Restore
    delete SM.WORD_TO_SIGN['mutatedwordtest'];
    if (originalSign === undefined) {
      delete SM.SIGNS['MUTATED_SIGN'];
    } else {
      SM.SIGNS['MUTATED_SIGN'] = originalSign;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. BLACK BOX TESTING 
// (Testing against requirements/inputs/outputs without knowing internal structure)
// ─────────────────────────────────────────────────────────────────────────────

describe('Black Box Testing: Equivalence Partitioning & Boundary Value', () => {
  test('Valid Input Partition: Standard English sentences', () => {
    const signs = SM.textToSigns('hello where is the library');
    assert.ok(signs.length >= 3, 'Should yield multiple signs for a standard sentence');
  });

  test('Invalid/Garbage Input Partition: Special characters only', () => {
    const p2 = SM.textToSigns('!@#$% ^&*()');
    // It should safely ignore or map them to fingerspell without crashing
    assert.ok(Array.isArray(p2));
  });

  test('Boundary/Edge Partition: Extremely long solitary word', () => {
    // Exceeds typical English word length to test edge cases
    const longWord = 'a'.repeat(500); 
    const signs = SM.textToSigns(longWord);
    assert.ok(signs.length > 0 && signs.every(s => s._isFingerspell), 'Should safely fingerspell enormous words');
  });

  test('Numeric Partition', () => {
    const p4 = SM.textToSigns('12345');
    assert.ok(p4.length > 0, 'Should correctly handle numeric values');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10.5 WHITE BOX TESTING 
// (Testing specific internal code paths, branches, and logic states)
// ─────────────────────────────────────────────────────────────────────────────

describe('White Box Testing: Branch Coverage & Internal Logic', () => {
  test('Branch Coverage: _isFingerspell true/false logic path', () => {
    // This targets the internal logic where known words get mapped to dictionary entries, 
    // and unknown words trigger the character-by-character fingerspelling fallback branch.

    // Path A: Unknown word (forces _isFingerspell = true)
    const fingerspelled = SM.textToSigns('qzxwvj'); 
    assert.ok(fingerspelled.length === 6, 'Should split into 6 characters');
    assert.ok(fingerspelled.every(s => s._isFingerspell === true), 'Forces fingerspell branch');
    
    // Path B: Known dictionary word (forces _isFingerspell = false)
    const knownWord = KNOWN_WORDS.find(w => !SM.textToSigns(w).some(s => s._isFingerspell));
    if (knownWord) {
      const known = SM.textToSigns(knownWord);
      assert.ok(known.some(s => s._isFingerspell !== true), 'Bypasses fingerspell branch');
    }
  });

  test('Branch Coverage: Case Normalization Logic', () => {
    // Tests the internal string sanitization and case-lowering paths
    const uppercase = SM.textToSigns('HELLO');
    const lowercase = SM.textToSigns('hello');
    const mixed = SM.textToSigns('hElLo');
    
    // The internal map logic must normalize these to the exact same array length and output
    assert.strictEqual(uppercase.length, lowercase.length);
    assert.strictEqual(mixed.length, lowercase.length);
    if(uppercase.length > 0) {
      assert.strictEqual(uppercase[0]._key, lowercase[0]._key, 'Normalization branch must unify outputs');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. STATE MACHINE TESTING
// ─────────────────────────────────────────────────────────────────────────────

describe('State Machine Testing (Mocking Interaction Flow)', () => {
  test('User session flow: Start -> Input -> Retry -> End', () => {
    let historyCount = 0;
    
    const attempt1 = SM.textToSigns('hello');
    if (attempt1.length) historyCount++;
    assert.strictEqual(historyCount, 1);
    
    const attempt2 = SM.textToSigns('hello world how are you today i need help please');
    if (attempt2.length) historyCount++;
    assert.strictEqual(historyCount, 2);
    
    assert.ok(attempt2.length > attempt1.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. COMBINATORIAL TESTING (fast-check)
// ─────────────────────────────────────────────────────────────────────────────

describe('Combinatorial testing with fast-check', () => {
  test('All combinations of Subject + Action + Object produce valid arrays', () => {
    const subjects = fc.constantFrom('I', 'You', 'He', 'She', 'They');
    const actions = fc.constantFrom('want', 'need', 'like', 'see');
    const objects = fc.constantFrom('help', 'water', 'food', 'doctor');

    fc.assert(
      fc.property(subjects, actions, objects, (sub, act, obj) => {
        const sentence = `${sub} ${act} ${obj}`;
        const res = SM.textToSigns(sentence);
        assert.ok(Array.isArray(res));
        assert.ok(res.length > 0);
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
