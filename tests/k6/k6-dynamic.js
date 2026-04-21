/**
 * k6 Dynamic / Fuzzing Test — TraduMust API
 * This test performs Black Box Dynamic Testing on the live API endpoints.
 * It sends randomized, mutated, edge-case, and boundary-value payloads 
 * to ensure that the API engine does not crash (5xx errors) under unexpected inputs.
 * 
 * Run: k6 run tests/k6/k6-dynamic.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Metrics ────────────────────────────────────────────────────────────────
const errorRate = new Rate('fuzz_error_rate');
const fallbackTriggers = new Counter('fuzz_fallback_triggers');
const dynLatency = new Trend('dynamic_api_latency', true);

export const options = {
  vus: 5,
  duration: '1m', // 1 minute of non-stop randomized hammering
  thresholds: {
    // We expect 400/422 responses on garbage data, but NEVER 500s (server crashes)
    'http_req_failed{status:500}': ['rate==0'], 
    'http_req_failed{status:502}': ['rate==0'],
  },
};

const BASE = 'http://127.0.0.1:8001';
const HEADERS = { 'Content-Type': 'application/json' };

// ── Mutation / Fuzzing Payload Generators ──────────────────────────────────

function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !@#$%^&*()_+{}|:<>?~';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getGarbagePayloads() {
  return [
    '',                                      // Empty string
    '     ',                                 // Whitespace only
    randomString(1000),                      // Extremely long string (1k chars)
    'Hello \x00 World',                      // Null bytes / malformed unicode
    'DROP TABLE users;--',                   // SQL Injection attempt
    '<script>alert("xss")</script>',         // XSS attempt
    '{"malformed json":',                    // Broken JSON structure (sent as raw string)
    null,                                    // Null value 
    1234567890,                              // Integer instead of string
    'مرحبا كيف حالك 你好世界 🙌🚀',            // Unicode/RTL/Emoji stress
  ];
}

export default function () {
  const garbage = getGarbagePayloads();
  const input = garbage[__ITER % garbage.length];

  group('Dynamic Fuzzing: /api/translate', () => {
    const t0 = Date.now();
    const payload = typeof input === 'string' && input.includes('malformed') 
      ? input 
      : JSON.stringify({ text: input, target_lang: 'fr' });

    const r = http.post(`${BASE}/api/translate`, payload, { headers: HEADERS });
    dynLatency.add(Date.now() - t0);

    // Dynamic Logic Validation: 
    // It's a success if it succeeds (200) OR cleanly rejects bad inputs (422/400).
    const ok = check(r, { 
      'Translate survived (No 5xx crash)': (res) => res.status < 500,
      'Translate schema validation handles bad types': (res) => res.status === 200 || res.status === 422 
    });
    errorRate.add(!ok);
  });

  group('Dynamic Fuzzing: /api/text-to-sign', () => {
    const t0 = Date.now();
    const payload = typeof input === 'string' && input.includes('malformed') 
      ? input 
      : JSON.stringify({ text: input, sign_language: __VU % 2 === 0 ? 'ASL' : 'UNKNOWN_LANG' }); // Boundary language test

    const r = http.post(`${BASE}/api/text-to-sign`, payload, { headers: HEADERS });
    dynLatency.add(Date.now() - t0);

    const ok = check(r, { 
      'Text-to-Sign survived (No 5xx crash)': (res) => res.status < 500,
    });
    errorRate.add(!ok);

    if (r.status === 200 && r.json('fingerspell_fallback')) {
       // If the random garbage was successfully parsed as fingerspelling, log it
       fallbackTriggers.add(1);
    }
  });

  group('Dynamic Fuzzing: /api/sign/classify', () => {
    // Generate chaotic arrays for landmarks that defy typical coordinate logic (negatives, massive arrays)
    const chaoticLandmarks = [
      Array(100).fill({x:1, y:1, z:1}), // Way too many landmarks
      Array(5).fill({x:-999, y:-999, z: 'not-a-number'}), // Bad types
      [], // Empty arrays
    ];
    
    const lm = chaoticLandmarks[__ITER % chaoticLandmarks.length];
    
    const t0 = Date.now();
    const r = http.post(`${BASE}/api/sign/classify`, JSON.stringify({ right_hand: lm }), { headers: HEADERS });
    dynLatency.add(Date.now() - t0);

    const ok = check(r, { 
      'Classify model survived (No 500)': (res) => res.status < 500,
    });
    errorRate.add(!ok);
  });

  sleep(0.05);
}

export function handleSummary(data) {
  const filename = __ENV.SUMMARY_PATH || './tests/k6/results/dynamic-fuzz-summary.json';
  return {
    [filename]: JSON.stringify(data),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
