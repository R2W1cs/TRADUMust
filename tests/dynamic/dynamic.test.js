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

describe('Dynamic / Fuzz Testing', () => {
  test('gracefully handles random dynamic strings', () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !@#$%^&*()_+-=[];\',./<>?:"{}|\\~`';
    let passed = 0;
    const iters = 2000;
    
    for (let i = 0; i < iters; i++) {
        let length = Math.floor(Math.random() * 100);
        let str = '';
        for (let j = 0; j < length; j++) {
            str += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Ensure no crash
        assert.doesNotThrow(() => {
            const result = SM.textToSigns(str);
            assert.ok(Array.isArray(result));
            passed++;
        }, `Failed on input: ${str}`);
    }
    
    assert.strictEqual(passed, iters);
  });

  test('gracefully handles arrays of varied words', () => {
    const words = Object.keys(SM.WORD_TO_SIGN).concat(Object.keys(VOCAB), ['xqz', 'hello', '!@#', '']);
    let passed = 0;
    const iters = 1000;

    for (let i = 0; i < iters; i++) {
        let sentenceWords = [];
        let numWords = Math.floor(Math.random() * 20);
        for(let j = 0; j < numWords; j++) {
            sentenceWords.push(words[Math.floor(Math.random() * words.length)]);
        }
        let sentence = sentenceWords.join(' ');
        
        assert.doesNotThrow(() => {
            const result = SM.textToSigns(sentence);
            assert.ok(Array.isArray(result));
            passed++;
        });
    }

    assert.strictEqual(passed, iters);
  });
});
