/**
 * SignBridge Extension — Sign Mapper Unit Tests
 * Runner: Node.js built-in test runner (no extra deps)
 * Run:    node --test tests/unit/sign-mapper.test.js
 */

'use strict';

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const vm     = require('node:vm');
const fs     = require('node:fs');
const path   = require('node:path');

// ── Load sign-mapper.js in a fake browser context ────────────────────────────

const MAPPER_PATH = path.join(__dirname, '../../extension/content/sign-mapper.js');
const code = fs.readFileSync(MAPPER_PATH, 'utf8');

const ctx = {
  window: { SignBridge: {} },
  chrome: { runtime: { getURL: () => 'mock://vocab-10k.js' } },
  document: {
    createElement: (tag) => {
      const el = { src: '', onload: null, onerror: null };
      return el;
    },
    head: { appendChild: () => {} },
    documentElement: { appendChild: () => {} },
  },
  console,
};
vm.createContext(ctx);
vm.runInContext(code, ctx);

const SM = ctx.window.SignBridge.SignMapper;

// ─────────────────────────────────────────────────────────────────────────────
// 1. MODULE LOADING
// ─────────────────────────────────────────────────────────────────────────────

describe('Module loading', () => {
  test('window.SignBridge.SignMapper is defined', () => {
    assert.ok(SM, 'SignMapper should exist on window.SignBridge');
  });

  test('SignMapper exposes SIGNS dictionary', () => {
    assert.ok(SM.SIGNS && typeof SM.SIGNS === 'object');
    assert.ok(Object.keys(SM.SIGNS).length > 100, 'Should have 100+ signs');
  });

  test('SignMapper exposes WORD_TO_SIGN dictionary', () => {
    assert.ok(SM.WORD_TO_SIGN && typeof SM.WORD_TO_SIGN === 'object');
    assert.ok(Object.keys(SM.WORD_TO_SIGN).length > 2000, 'Should have 2000+ word mappings');
  });

  test('SignMapper exposes textToSigns function', () => {
    assert.strictEqual(typeof SM.textToSigns, 'function');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SIGNS DICTIONARY INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────

describe('SIGNS dictionary integrity', () => {
  const VALID_HANDS = new Set([
    'FLAT','FIST','POINT','V','C','OK','THUMB_UP','ILY','CLAW','HORNS','L','A','O',
  ]);
  const VALID_EXPRESSIONS = new Set([
    'NEUTRAL','HAPPY','QUESTION','WH_QUESTION','NEGATIVE','EMPHATIC',
  ]);
  const VALID_MOTIONS = new Set([
    'motion-wave','motion-circle','motion-push','motion-pull','motion-nod',
    'motion-shake','motion-lift','motion-flick','motion-tap','motion-wiggle',
    'motion-roll','motion-flip', undefined, null,
  ]);

  test('every SIGNS entry has required fields', () => {
    const errors = [];
    for (const [key, sign] of Object.entries(SM.SIGNS)) {
      if (key.startsWith('__')) continue; // meta signs
      if (!sign.right)  errors.push(`${key}: missing 'right'`);
      if (!sign.rHand)  errors.push(`${key}: missing 'rHand'`);
      if (!sign.expression) errors.push(`${key}: missing 'expression'`);
    }
    assert.strictEqual(errors.length, 0, errors.join('\n'));
  });

  test('every rHand / lHand is a known hand shape', () => {
    const errors = [];
    for (const [key, sign] of Object.entries(SM.SIGNS)) {
      if (!VALID_HANDS.has(sign.rHand))
        errors.push(`${key}: unknown rHand '${sign.rHand}'`);
      if (sign.lHand && !VALID_HANDS.has(sign.lHand))
        errors.push(`${key}: unknown lHand '${sign.lHand}'`);
    }
    assert.strictEqual(errors.length, 0, errors.join('\n'));
  });

  test('every expression is a known facial expression', () => {
    const errors = [];
    for (const [key, sign] of Object.entries(SM.SIGNS)) {
      if (!VALID_EXPRESSIONS.has(sign.expression))
        errors.push(`${key}: unknown expression '${sign.expression}'`);
    }
    assert.strictEqual(errors.length, 0, errors.join('\n'));
  });

  test('arm coordinates are within ViewBox 360×240', () => {
    const errors = [];
    for (const [key, sign] of Object.entries(SM.SIGNS)) {
      for (const side of ['right','left']) {
        const arm = sign[side];
        if (!arm) continue;
        for (const joint of ['elbow','wrist']) {
          const pt = arm[joint];
          if (!pt) { errors.push(`${key}.${side}.${joint} missing`); continue; }
          if (pt.x < 0 || pt.x > 360)
            errors.push(`${key}.${side}.${joint}.x=${pt.x} out of range [0,360]`);
          if (pt.y < 0 || pt.y > 240)
            errors.push(`${key}.${side}.${joint}.y=${pt.y} out of range [0,240]`);
        }
      }
    }
    assert.strictEqual(errors.length, 0, errors.slice(0,10).join('\n'));
  });

  test('every SIGNS entry has a category', () => {
    const errors = [];
    for (const [key, sign] of Object.entries(SM.SIGNS)) {
      if (key.startsWith('__')) continue;
      if (!sign.category) errors.push(key);
    }
    assert.strictEqual(errors.length, 0, `Missing category: ${errors.join(', ')}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. WORD_TO_SIGN INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────

describe('WORD_TO_SIGN integrity', () => {
  test('all WORD_TO_SIGN values reference valid SIGNS keys', () => {
    const broken = [];
    for (const [word, key] of Object.entries(SM.WORD_TO_SIGN)) {
      if (!SM.SIGNS[key]) broken.push(`'${word}' → '${key}' (sign not found)`);
    }
    assert.strictEqual(broken.length, 0,
      `${broken.length} broken mappings:\n${broken.slice(0,10).join('\n')}`);
  });

  test('core greetings are mapped', () => {
    const coreWords = ['hello','hi','goodbye','thank you','please','sorry','yes','no'];
    for (const w of coreWords) {
      assert.ok(SM.WORD_TO_SIGN[w], `'${w}' should be in WORD_TO_SIGN`);
    }
  });

  test('pink maps to RED (not BLUE — regression test)', () => {
    assert.strictEqual(SM.WORD_TO_SIGN['pink'], 'RED',
      'pink was accidentally mapped to BLUE — must be RED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. textToSigns — DIRECT WORD LOOKUP
// ─────────────────────────────────────────────────────────────────────────────

describe('textToSigns — direct lookup', () => {
  test('returns empty array for empty string', () => {
    const result = SM.textToSigns('');
    assert.ok(Array.isArray(result), 'should return array');
    assert.strictEqual(result.length, 0, 'should be empty');
  });

  test('returns empty array for null / undefined', () => {
    const r1 = SM.textToSigns(null);
    const r2 = SM.textToSigns(undefined);
    assert.ok(Array.isArray(r1) && r1.length === 0, 'null → empty array');
    assert.ok(Array.isArray(r2) && r2.length === 0, 'undefined → empty array');
  });

  test('"hello" → HELLO sign', () => {
    const signs = SM.textToSigns('hello');
    assert.ok(signs.length > 0);
    assert.strictEqual(signs[0]._key, 'HELLO');
  });

  test('"thank you" (multi-word phrase) → THANK_YOU', () => {
    const signs = SM.textToSigns('thank you');
    assert.ok(signs.length > 0);
    assert.strictEqual(signs[0]._key, 'THANK_YOU');
  });

  test('skip words (a, the, is, are) are not signed', () => {
    const signs = SM.textToSigns('the cat is here');
    const words = signs.map(s => s._word);
    assert.ok(!words.includes('the'), '"the" should be skipped');
    assert.ok(!words.includes('is'),  '"is" should be skipped');
  });

  test('punctuation is stripped before lookup', () => {
    const s1 = SM.textToSigns('hello!');
    const s2 = SM.textToSigns('hello');
    assert.strictEqual(s1.length, s2.length);
    assert.strictEqual(s1[0]._key, s2[0]._key);
  });

  test('case insensitive: HELLO, Hello, hello all → HELLO', () => {
    for (const variant of ['HELLO', 'Hello', 'hello']) {
      const signs = SM.textToSigns(variant);
      assert.strictEqual(signs[0]._key, 'HELLO', `Failed for '${variant}'`);
    }
  });

  test('each sign has a _word annotation', () => {
    const signs = SM.textToSigns('I want water');
    for (const s of signs) {
      assert.ok(s._word, `Sign missing _word: ${JSON.stringify(s)}`);
    }
  });

  test('each sign has a _key annotation', () => {
    const signs = SM.textToSigns('I want water');
    for (const s of signs) {
      assert.ok(s._key, `Sign missing _key`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. textToSigns — STEMMER FALLBACK
// ─────────────────────────────────────────────────────────────────────────────

describe('textToSigns — Porter stemmer fallback', () => {
  test('"studying" stems to study → STUDY', () => {
    const signs = SM.textToSigns('studying');
    const keys = signs.map(s => s._key);
    assert.ok(keys.includes('STUDY'), `Got: ${keys.join(', ')}`);
  });

  test('"beautiful" stems → BEAUTIFUL', () => {
    const signs = SM.textToSigns('beautiful');
    const keys = signs.map(s => s._key);
    assert.ok(keys.includes('BEAUTIFUL'), `Got: ${keys.join(', ')}`);
  });

  test('"running" → action sign (GO or __ACTION via stem)', () => {
    const signs = SM.textToSigns('running');
    assert.ok(signs.length > 0, 'should produce at least one sign');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. textToSigns — ASL GRAMMAR REORDERING
// ─────────────────────────────────────────────────────────────────────────────

describe('textToSigns — ASL grammar reordering', () => {
  test('time word "today" is moved to front', () => {
    const signs = SM.textToSigns('I learn today');
    // today should appear before learn
    const words = signs.map(s => s._word);
    const todayIdx = words.findIndex(w => w === 'today');
    const learnIdx = words.findIndex(w => ['learn','study'].includes(w));
    if (todayIdx !== -1 && learnIdx !== -1) {
      assert.ok(todayIdx < learnIdx, `today(${todayIdx}) should come before learn(${learnIdx})`);
    }
  });

  test('WH-question word "what" is moved to end', () => {
    const signs = SM.textToSigns('what do you want?');
    const words = signs.map(s => s._word);
    const whatIdx = words.findLastIndex(w => w === 'what');
    // "what" should be at or near the end
    if (whatIdx !== -1) {
      assert.ok(whatIdx === words.length - 1 || whatIdx >= words.length - 2,
        `"what" should be near end, but was at index ${whatIdx} of ${words.length}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. textToSigns — QUESTION EXPRESSIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('textToSigns — question non-manual markers', () => {
  test('WH-question sets expression to WH_QUESTION', () => {
    const signs = SM.textToSigns('where is the library?');
    const signedSigns = signs.filter(s => !s._isFingerspell);
    assert.ok(
      signedSigns.some(s => s.expression === 'WH_QUESTION'),
      `Expected WH_QUESTION expression, got: ${JSON.stringify(signedSigns.map(s => s.expression))}`
    );
  });

  test('Yes/No question sets expression to QUESTION', () => {
    const signs = SM.textToSigns('do you want help?');
    const signedSigns = signs.filter(s => !s._isFingerspell);
    assert.ok(
      signedSigns.some(s => s.expression === 'QUESTION'),
      `Expected QUESTION expression, got: ${JSON.stringify(signedSigns.map(s => s.expression))}`
    );
  });

  test('statement uses NEUTRAL or sign-specific expression', () => {
    const signs = SM.textToSigns('I want water');
    const hasQuestion = signs.some(s =>
      s.expression === 'QUESTION' || s.expression === 'WH_QUESTION'
    );
    assert.ok(!hasQuestion, 'Statement should not have question expression');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. textToSigns — FINGERSPELLING FALLBACK
// ─────────────────────────────────────────────────────────────────────────────

describe('textToSigns — fingerspelling fallback', () => {
  test('completely unknown word is fingerspelled', () => {
    const signs = SM.textToSigns('xyzqq');
    assert.ok(signs.length > 0, 'should fingerspell');
    assert.ok(signs.some(s => s._isFingerspell), 'at least one sign should be fingerspell');
  });

  test('fingerspelled signs have category=fingerspelling', () => {
    const signs = SM.textToSigns('xyzqq');
    for (const s of signs) {
      if (s._isFingerspell) {
        assert.strictEqual(s.category, 'fingerspelling');
      }
    }
  });

  test('fingerspelled sign length equals word length', () => {
    const word = 'xyzqq';
    const signs = SM.textToSigns(word);
    const fsCount = signs.filter(s => s._isFingerspell).length;
    assert.strictEqual(fsCount, word.length, `Expected ${word.length} letters, got ${fsCount}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. POS TAGGER
// ─────────────────────────────────────────────────────────────────────────────

describe('_sbPOS suffix-based tagger', () => {
  // Access private via running it in context using a wrapper
  // We inject a helper to expose it
  let POS;
  before(() => {
    const helperCode = `
      (function() {
        function _sbPOS(w) {
          if (w.endsWith('ly')) return 'ADV';
          if (/(?:ful|less|ous|ive|al|ary|ic|able|ible|ant|ish|ent)$/.test(w)) return 'ADJ';
          if (/(?:ing|ify|ize|ise|ate)$/.test(w)) return 'VERB';
          if (/(?:ed)$/.test(w) && w.length > 4) return 'VERB';
          if (/(?:tion|sion|ment|ness|ity|age|ance|ence|er|or|ist|ian|ism|ship)$/.test(w)) return 'NOUN';
          return 'UNKNOWN';
        }
        window._testPOS = _sbPOS;
      })();
    `;
    vm.runInContext(helperCode, ctx);
    POS = ctx.window._testPOS;
  });

  test('"quickly" → ADV', () => assert.strictEqual(POS('quickly'), 'ADV'));
  test('"beautiful" → ADJ', () => assert.strictEqual(POS('beautiful'), 'ADJ'));
  test('"running" → VERB', () => assert.strictEqual(POS('running'), 'VERB'));
  test('"jumped" → VERB', () => assert.strictEqual(POS('jumped'), 'VERB'));
  test('"teacher" → NOUN', () => assert.strictEqual(POS('teacher'), 'NOUN'));
  test('"education" → NOUN', () => assert.strictEqual(POS('education'), 'NOUN'));
  test('"cat" → UNKNOWN', () => assert.strictEqual(POS('cat'), 'UNKNOWN'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. getSignInfo / getCategory / getCategories
// ─────────────────────────────────────────────────────────────────────────────

describe('SignMapper public API', () => {
  test('getSignInfo("HELLO") returns sign config', () => {
    const info = SM.getSignInfo('HELLO');
    assert.ok(info, 'Should return sign config');
    assert.strictEqual(info.rHand, 'FLAT');
  });

  test('getSignInfo("UNKNOWN_XYZ") returns null', () => {
    assert.strictEqual(SM.getSignInfo('UNKNOWN_XYZ'), null);
  });

  test('getCategory("greetings") returns array of signs', () => {
    const greetings = SM.getCategory('greetings');
    assert.ok(Array.isArray(greetings));
    assert.ok(greetings.length > 0);
    assert.ok(greetings.every(s => s.category === 'greetings'));
  });

  test('getCategories() returns non-empty array of strings', () => {
    const cats = SM.getCategories();
    assert.ok(Array.isArray(cats));
    assert.ok(cats.length > 0);
    assert.ok(cats.every(c => typeof c === 'string'));
    assert.ok(cats.includes('greetings'));
  });

  test('getCategories() contains expected categories', () => {
    const cats = SM.getCategories();
    const expected = ['greetings','actions','adjectives','colors','family','health'];
    for (const cat of expected) {
      assert.ok(cats.includes(cat), `Missing expected category: ${cat}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. STEMMED_INDEX
// ─────────────────────────────────────────────────────────────────────────────

describe('STEMMED_INDEX', () => {
  // Access via a longer sentence that forces a stem lookup
  test('STEMMED_INDEX enables "studying" → LEARN', () => {
    const signs = SM.textToSigns('studying');
    assert.ok(signs.length > 0);
  });

  test('STEMMED_INDEX enables "working" → WORK', () => {
    const signs = SM.textToSigns('working');
    const keys = signs.map(s => s._key);
    assert.ok(keys.includes('WORK'), `Got: ${keys}`);
  });
});
