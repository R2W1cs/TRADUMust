/**
 * k6 Stress Test — TraduMust API
 * Pushes beyond normal load to find the breaking point.
 * VUs ramp to 100, then beyond — we watch at what point error rate spikes.
 * Run: k6 run tests/k6/k6-stress.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

const errorRate    = new Rate('error_rate');
const latency      = new Trend('api_latency', true);
const errorCount   = new Counter('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10  },  // warm up
    { duration: '30s', target: 30  },  // increasing load
    { duration: '30s', target: 60  },  // heavy load
    { duration: '30s', target: 100 },  // near-breaking point
    { duration: '30s', target: 60  },  // recover
    { duration: '30s', target: 0   },  // ramp down
  ],
  thresholds: {
    http_req_failed:  ['rate<0.10'],   // Stress allows up to 10% errors
    error_rate:       ['rate<0.10'],
    api_latency:      ['p(95)<10000'], // 10s p95 allowed under max stress
  },
};

const BASE    = 'http://127.0.0.1:8001';
const HEADERS = { 'Content-Type': 'application/json' };

const PAYLOADS = [
  { text: 'Stress test one',    target_lang: 'fr' },
  { text: 'Stress test two',    target_lang: 'de' },
  { text: 'Stress test three',  target_lang: 'ja' },
  { text: 'Stress test four',   target_lang: 'es' },
  { text: 'Stress test five',   target_lang: 'zh' },
];

export default function () {
  // Health — lightweight probe
  group('health_probe', () => {
    const r = http.get(`${BASE}/api/health`);
    const ok = check(r, { 'health:200': (res) => res.status === 200 });
    errorRate.add(!ok);
    if (!ok) errorCount.add(1);
  });

  // Mix of endpoints to stress the full API surface
  const scenario = __VU % 8;

  if (scenario === 0) {
    group('translate_stress', () => {
      const p = PAYLOADS[__ITER % PAYLOADS.length];
      const t0 = Date.now();
      const r = http.post(`${BASE}/api/translate`, JSON.stringify(p), { headers: HEADERS });
      latency.add(Date.now() - t0);
      const ok = check(r, { 'translate:status < 500': (res) => res.status < 500 });
      errorRate.add(!ok);
      if (!ok) errorCount.add(1);
    });

  } else if (scenario === 1) {
    group('text_to_sign_stress', () => {
      const t0 = Date.now();
      const r = http.post(`${BASE}/api/text-to-sign`, JSON.stringify({ text: `Stress sentence iteration ${__ITER}`, sign_language: 'ASL' }), { headers: HEADERS });
      latency.add(Date.now() - t0);
      const ok = check(r, { 'text_to_sign:status < 500': (res) => res.status < 500 });
      errorRate.add(!ok);
    });

  } else if (scenario === 2) {
    group('history_stress', () => {
      const t0 = Date.now();
      const r = http.get(`${BASE}/api/history?limit=10`);
      latency.add(Date.now() - t0);
      const ok = check(r, { 'history:status < 500': (res) => res.status < 500 });
      errorRate.add(!ok);
    });

  } else if (scenario === 3) {
    group('cultural_notes_stress', () => {
      const langs = ['fr','es','ja','de','zh'];
      const lang  = langs[__VU % langs.length];
      const t0 = Date.now();
      const r = http.get(`${BASE}/api/cultural-notes/${lang}`);
      latency.add(Date.now() - t0);
      const ok = check(r, { 'cultural:status < 500': (res) => res.status < 500 });
      errorRate.add(!ok);
    });

  } else if (scenario === 4) {
    group('extract_landmarks_stress', () => {
      const payload = {
        frame_b64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        width: 1,
        height: 1
      };
      const t0 = Date.now();
      const r = http.post(`${BASE}/api/sign/extract-landmarks`, JSON.stringify(payload), { headers: HEADERS });
      latency.add(Date.now() - t0);
      const ok = check(r, { 'extract_landmarks:status < 500': (res) => res.status < 500 });
      errorRate.add(!ok);
    });

  } else if (scenario === 5) {
    group('classify_stress', () => {
      const payload = {
        right_hand: [{"x":0.5,"y":0.5,"z":0.0}],
        left_hand: [],
        pose: []
      };
      const t0 = Date.now();
      const r = http.post(`${BASE}/api/sign/classify`, JSON.stringify(payload), { headers: HEADERS });
      latency.add(Date.now() - t0);
      const ok = check(r, { 'classify:status < 500': (res) => res.status < 500 });
      errorRate.add(!ok);
    });

  } else if (scenario === 6) {
    group('ml_report_stress', () => {
      const t0 = Date.now();
      const r = http.get(`${BASE}/api/ml/report`);
      latency.add(Date.now() - t0);
      const ok = check(r, { 'ml_report:status < 500': (res) => res.status < 500 });
      errorRate.add(!ok);
    });

  } else {
    group('save_recognition_stress', () => {
      const payload = {
        text: `stress test save ${__ITER}`,
        sign_language: "ASL"
      };
      const t0 = Date.now();
      const r = http.post(`${BASE}/api/sign/save-recognition`, JSON.stringify(payload), { headers: HEADERS });
      latency.add(Date.now() - t0);
      const ok = check(r, { 'save_recognition:status < 500': (res) => res.status < 500 });
      errorRate.add(!ok);
    });
  }

  sleep(0.05);
}

/**
 * Handle summary for the master report
 */
export function handleSummary(data) {
  const filename = __ENV.SUMMARY_PATH || './tests/k6/results/stress-summary.json';
  return {
    [filename]: JSON.stringify(data),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
