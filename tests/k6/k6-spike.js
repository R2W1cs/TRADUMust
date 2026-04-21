/**
 * k6 Spike Test — TraduMust API
 * Simulates sudden traffic bursts (e.g., a class of 50 students all translating at once).
 * Verifies the API recovers cleanly after the spike.
 * Run: k6 run tests/k6/k6-spike.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const spikeErrors    = new Counter('spike_errors');
const recoveryTime   = new Trend('recovery_latency', true);
const spikeSuccess   = new Rate('spike_success_rate');

export const options = {
  stages: [
    { duration: '10s', target: 2   },  // baseline
    { duration: '5s',  target: 80  },  // SPIKE: instant traffic burst
    { duration: '20s', target: 80  },  // hold spike
    { duration: '5s',  target: 2   },  // CRASH: instant drop
    { duration: '20s', target: 2   },  // recovery period
    { duration: '5s',  target: 0   },  // done
  ],
  thresholds: {
    http_req_failed:  ['rate<0.20'],   // Spike allows higher error rate
    spike_success_rate: ['rate>=0.80'],
  },
};

const BASE    = 'http://127.0.0.1:8001';
const HEADERS = { 'Content-Type': 'application/json' };

const SPIKE_SENTENCES = [
  'Hello I am a student',
  'Where is the library?',
  'Thank you for helping me',
  'I want to learn French today',
  'Good morning professor',
  'Can you please repeat that?',
  'I do not understand',
  'My name is Maria',
];

export default function () {
  // ── Health probe (every VU) ───────────────────────────────────────────────
  group('spike_health', () => {
    const r = http.get(`${BASE}/api/health`, { timeout: '15s' });
    const ok = check(r, { 'spike/health: 200': (res) => res.status === 200 });
    spikeSuccess.add(ok ? 1 : 0);
    if (!ok) spikeErrors.add(1);
  });

  // ── Distribute VUs across all endpoints ───────────────────────────────────
  const scenario = __VU % 8;

  if (scenario === 0) {
    group('spike_translate', () => {
      const text = SPIKE_SENTENCES[__VU % SPIKE_SENTENCES.length];
      const r = http.post(
        `${BASE}/api/translate`,
        JSON.stringify({ text, target_lang: 'fr' }),
        { headers: HEADERS, timeout: '15s' }
      );
      const ok = check(r, { 'spike/translate: not 5xx': (res) => res.status < 500 });
      spikeSuccess.add(ok ? 1 : 0);
      if (!ok) spikeErrors.add(1);
    });

  } else if (scenario === 1) {
    group('spike_text_to_sign', () => {
      const text = SPIKE_SENTENCES[__ITER % SPIKE_SENTENCES.length];
      const r = http.post(
        `${BASE}/api/text-to-sign`,
        JSON.stringify({ text, sign_language: 'ASL' }),
        { headers: HEADERS, timeout: '15s' }
      );
      const ok = check(r, { 'spike/t2s: not 5xx': (res) => res.status < 500 });
      spikeSuccess.add(ok ? 1 : 0);
      if (!ok) spikeErrors.add(1);
    });

  } else if (scenario === 2) {
    group('spike_history', () => {
      const r = http.get(`${BASE}/api/history?limit=10`, { timeout: '15s' });
      const ok = check(r, { 'spike/history: not 5xx': (res) => res.status < 500 });
      spikeSuccess.add(ok ? 1 : 0);
      if (!ok) spikeErrors.add(1);
    });

  } else if (scenario === 3) {
    group('spike_cultural_notes', () => {
      const langs = ['fr','es','ja','de','zh','ar','ko','it','pt','en'];
      const lang = langs[__VU % langs.length];
      const r = http.get(`${BASE}/api/cultural-notes/${lang}`, { timeout: '15s' });
      const ok = check(r, { 'spike/cultural: not 5xx': (res) => res.status < 500 });
      spikeSuccess.add(ok ? 1 : 0);
      if (!ok) spikeErrors.add(1);
    });

  } else if (scenario === 4) {
    group('spike_extract_landmarks', () => {
      const payload = {
        frame_b64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        width: 1, height: 1
      };
      const r = http.post(`${BASE}/api/sign/extract-landmarks`, JSON.stringify(payload), { headers: HEADERS, timeout: '15s' });
      const ok = check(r, { 'spike/landmarks: not 5xx': (res) => res.status < 500 });
      spikeSuccess.add(ok ? 1 : 0);
      if (!ok) spikeErrors.add(1);
    });

  } else if (scenario === 5) {
    group('spike_classify', () => {
      const payload = { right_hand: [{"x":0.5,"y":0.5,"z":0.0}], left_hand: [], pose: [] };
      const r = http.post(`${BASE}/api/sign/classify`, JSON.stringify(payload), { headers: HEADERS, timeout: '15s' });
      const ok = check(r, { 'spike/classify: not 5xx': (res) => res.status < 500 });
      spikeSuccess.add(ok ? 1 : 0);
      if (!ok) spikeErrors.add(1);
    });

  } else if (scenario === 6) {
    group('spike_ml_report', () => {
      const r = http.get(`${BASE}/api/ml/report`, { timeout: '15s' });
      const ok = check(r, { 'spike/ml_report: not 5xx': (res) => res.status < 500 });
      spikeSuccess.add(ok ? 1 : 0);
      if (!ok) spikeErrors.add(1);
    });

  } else {
    group('spike_save_recognition', () => {
      const payload = { text: `spike recognition ${__ITER}`, sign_language: 'ASL' };
      const r = http.post(`${BASE}/api/sign/save-recognition`, JSON.stringify(payload), { headers: HEADERS, timeout: '15s' });
      const ok = check(r, { 'spike/save_recog: not 5xx': (res) => res.status < 500 });
      spikeSuccess.add(ok ? 1 : 0);
      if (!ok) spikeErrors.add(1);
    });
  }

  // ── Recovery probe (low-VU baseline only) ─────────────────────────────────
  if (__VU <= 2) {
    group('recovery_probe', () => {
      const t1 = Date.now();
      const r  = http.get(`${BASE}/api/health`);
      recoveryTime.add(Date.now() - t1);
      check(r, { 'recovery: health 200': (res) => res.status === 200 });
    });
  }

  sleep(0.1);
}

/**
 * Handle summary for the master report
 */
export function handleSummary(data) {
  const filename = __ENV.SUMMARY_PATH || './tests/k6/results/spike-summary.json';
  return {
    [filename]: JSON.stringify(data),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
