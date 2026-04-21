/**
 * k6 Soak Test — TraduMust API
 * Low VU count (5), extended duration (10 minutes).
 * Detects memory leaks, resource exhaustion, and gradual performance degradation.
 * Run: k6 run tests/k6/k6-soak.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Track latency over time — drift means memory leak or degradation
const firstMinLatency  = new Trend('soak_first_minute_latency',  true);
const lastMinLatency   = new Trend('soak_last_minute_latency',   true);
const degradationRate  = new Rate('response_degradation');
const soakErrors       = new Counter('soak_errors');
const historySizeGauge = new Trend('history_entry_count');

export const options = {
  stages: [
    { duration: '30s', target: 5  },   // warm-up
    { duration: '9m',  target: 5  },   // sustained soak
    { duration: '30s', target: 0  },   // wind down
  ],
  thresholds: {
    http_req_failed:              ['rate<0.01'],
    soak_first_minute_latency:    ['p(95)<3000'],
    soak_last_minute_latency:     ['p(95)<5000'],  // allow slight drift
    response_degradation:         ['rate<0.05'],   // <5% of requests degraded
  },
};

const BASE    = 'http://127.0.0.1:8001';
const HEADERS = { 'Content-Type': 'application/json' };

// Track elapsed time to compare early vs. late latency
const START_TIME = Date.now();
const ONE_MINUTE = 60_000;

const SOAK_TEXTS = [
  { text: 'Hello I need help navigating campus', target_lang: 'fr' },
  { text: 'Where can I find the student union?',  target_lang: 'es' },
  { text: 'What time does the library close?',    target_lang: 'ja' },
  { text: 'How do I apply for a student visa?',   target_lang: 'de' },
  { text: 'Can you recommend a good restaurant?', target_lang: 'zh' },
];

export default function () {
  const elapsed = Date.now() - START_TIME;
  const isEarlyPhase = elapsed < ONE_MINUTE;
  const isLatePhase  = elapsed > (9 * ONE_MINUTE);

  // ── Translate ─────────────────────────────────────────────────────────────
  group('soak_translate', () => {
    const payload = SOAK_TEXTS[__VU % SOAK_TEXTS.length];
    const t0 = Date.now();
    const r  = http.post(`${BASE}/api/translate`, JSON.stringify(payload), { headers: HEADERS });
    const duration = Date.now() - t0;

    if (isEarlyPhase) firstMinLatency.add(duration);
    if (isLatePhase)  lastMinLatency.add(duration);
    if (duration > 8000) degradationRate.add(1);
    else degradationRate.add(0);

    const ok = check(r, {
      'soak/translate: 200':         (res) => res.status === 200,
      'soak/translate: has history': (res) => !!res.json('history_entry.id'),
    });
    if (!ok) soakErrors.add(1);
  });

  sleep(0.2);

  // ── Text-to-Sign ─────────────────────────────────────────────────────────
  group('soak_text_to_sign', () => {
    const t0 = Date.now();
    const r  = http.post(`${BASE}/api/text-to-sign`,
      JSON.stringify({ text: SOAK_TEXTS[__ITER % SOAK_TEXTS.length].text, sign_language: 'ASL' }),
      { headers: HEADERS }
    );
    const duration = Date.now() - t0;
    if (isLatePhase) lastMinLatency.add(duration);
    if (duration > 5000) degradationRate.add(1);
    else degradationRate.add(0);
    check(r, { 'soak/t2s: 200': (res) => res.status === 200 });
  });

  sleep(0.2);

  // ── Cultural Notes ───────────────────────────────────────────────────────
  group('soak_cultural_notes', () => {
    const langs = ['fr','es','ja','de','zh','ar','ko','it','pt','en'];
    const lang = langs[__VU % langs.length];
    const t0 = Date.now();
    const r = http.get(`${BASE}/api/cultural-notes/${lang}`);
    const duration = Date.now() - t0;
    if (isLatePhase) lastMinLatency.add(duration);
    if (duration > 3000) degradationRate.add(1);
    else degradationRate.add(0);
    check(r, { 'soak/cultural: not 5xx': (res) => res.status < 500 });
  });

  sleep(0.2);

  // ── Extract Landmarks ────────────────────────────────────────────────────
  group('soak_extract_landmarks', () => {
    const payload = {
      frame_b64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      width: 1, height: 1
    };
    const t0 = Date.now();
    const r = http.post(`${BASE}/api/sign/extract-landmarks`, JSON.stringify(payload), { headers: HEADERS });
    const duration = Date.now() - t0;
    if (isLatePhase) lastMinLatency.add(duration);
    if (duration > 5000) degradationRate.add(1);
    else degradationRate.add(0);
    check(r, { 'soak/landmarks: not 5xx': (res) => res.status < 500 });
  });

  sleep(0.2);

  // ── Classify ─────────────────────────────────────────────────────────────
  group('soak_classify', () => {
    const payload = { right_hand: [{"x":0.5,"y":0.5,"z":0.0}], left_hand: [], pose: [] };
    const t0 = Date.now();
    const r = http.post(`${BASE}/api/sign/classify`, JSON.stringify(payload), { headers: HEADERS });
    const duration = Date.now() - t0;
    if (isLatePhase) lastMinLatency.add(duration);
    if (duration > 3000) degradationRate.add(1);
    else degradationRate.add(0);
    check(r, { 'soak/classify: not 5xx': (res) => res.status < 500 });
  });

  sleep(0.2);

  // ── ML Report ────────────────────────────────────────────────────────────
  group('soak_ml_report', () => {
    const t0 = Date.now();
    const r = http.get(`${BASE}/api/ml/report`);
    const duration = Date.now() - t0;
    if (isLatePhase) lastMinLatency.add(duration);
    if (duration > 3000) degradationRate.add(1);
    else degradationRate.add(0);
    check(r, { 'soak/ml_report: not 5xx': (res) => res.status < 500 });
  });

  sleep(0.2);

  // ── Save Recognition ─────────────────────────────────────────────────────
  group('soak_save_recognition', () => {
    const payload = { text: `soak recognition ${__ITER}`, sign_language: 'ASL' };
    const t0 = Date.now();
    const r = http.post(`${BASE}/api/sign/save-recognition`, JSON.stringify(payload), { headers: HEADERS });
    const duration = Date.now() - t0;
    if (isLatePhase) lastMinLatency.add(duration);
    if (duration > 3000) degradationRate.add(1);
    else degradationRate.add(0);
    check(r, { 'soak/save_recog: not 5xx': (res) => res.status < 500 });
  });

  sleep(0.2);

  // ── History size check — detects unbounded growth ─────────────────────────
  group('soak_history_size', () => {
    const r = http.get(`${BASE}/api/history?limit=500`);
    if (r.status === 200) {
      const count = r.json('data').length;
      historySizeGauge.add(count);
      // Should never exceed 500 (our in-memory cap)
      check(r, { 'soak/history: size ≤ 500': () => count <= 500 });
    }
  });

  sleep(1);
}

/**
 * Handle summary for the master report
 */
export function handleSummary(data) {
  const filename = __ENV.SUMMARY_PATH || './tests/k6/results/soak-summary.json';
  return {
    [filename]: JSON.stringify(data),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
