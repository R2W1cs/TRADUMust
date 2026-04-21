/**
 * k6 Load Test — TraduMust API
 * Sustained load across all endpoints for 3 minutes with ramp-up/ramp-down.
 * Run: k6 run tests/k6/k6-load.js
 *
 * Stages:
 *   0→2 min: ramp from 0 to 20 VUs (warm-up)
 *   2→5 min: hold at 20 VUs (sustained load)
 *   5→6 min: ramp down to 0 VUs
 *
 * Thresholds (production SLOs):
 *   - p95 translate latency < 6s (includes real Google Translate call)
 *   - p95 text-to-sign latency < 2s
 *   - p99 history latency     < 200ms  (pure in-memory)
 *   - error rate              < 1%
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter, Rate, Gauge } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────
const translateP95    = new Trend('translate_duration',     true);
const textToSignP95   = new Trend('text_to_sign_duration',  true);
const historyP95      = new Trend('history_duration',       true);
const phrasebookP95   = new Trend('phrasebook_duration',    true);
const classifyP95     = new Trend('classify_duration',      true);
const culturalP95     = new Trend('cultural_notes_duration',true);
const errorCount      = new Counter('total_errors');
const successRate     = new Rate('overall_success_rate');
const activePhrasebookEntries = new Gauge('active_phrasebook_entries');

export const options = {
  stages: [
    { duration: '1m', target: 10 },  // ramp-up
    { duration: '2m', target: 20 },  // sustained
    { duration: '1m', target: 0  },  // ramp-down
  ],
  thresholds: {
    http_req_failed:         ['rate<0.01'],
    overall_success_rate:    ['rate>=0.99'],
    translate_duration:      ['p(95)<6000'],
    text_to_sign_duration:   ['p(95)<2000'],
    history_duration:        ['p(99)<300'],
    phrasebook_duration:     ['p(99)<300'],
    classify_duration:       ['p(95)<500'],
    cultural_notes_duration: ['p(95)<100'],
  },
  summaryTrendStats: ['min','avg','med','p(90)','p(95)','p(99)','max'],
};

const BASE    = 'http://127.0.0.1:8001';
const HEADERS = { 'Content-Type': 'application/json' };

const TRANSLATE_PAYLOADS = [
  { text: 'Hello how are you',           target_lang: 'fr' },
  { text: 'Good morning professor',      target_lang: 'ja' },
  { text: 'Where is the library?',       target_lang: 'es' },
  { text: 'Thank you for your help',     target_lang: 'de' },
  { text: 'I need water please',         target_lang: 'zh' },
  { text: 'Nice to meet you',            target_lang: 'ar' },
  { text: 'Can you repeat that?',        target_lang: 'ko' },
  { text: 'I am a student here',         target_lang: 'it' },
  { text: 'Do you speak English?',       target_lang: 'pt' },
  { text: 'Where is the bathroom?',      target_lang: 'en' },
];

const TEXT_TO_SIGN_PAYLOADS = [
  { text: 'Hello my name is Alex',                         sign_language: 'ASL' },
  { text: 'I want to learn sign language',                 sign_language: 'ASL' },
  { text: 'Where is the nearest hospital?',                sign_language: 'ASL' },
  { text: 'Today I will study computer science',           sign_language: 'ASL' },
  { text: 'Thank you very much for your patience',         sign_language: 'ASL' },
  { text: 'Can you please slow down when signing?',        sign_language: 'BSL' },
];

const CULTURAL_LANGS = ['fr', 'es', 'ja', 'de', 'zh', 'ar', 'ko', 'it', 'pt', 'en'];
const CLASSIFY_LANDMARKS = Array.from({ length: 21 }, () => ({ x: Math.random(), y: Math.random(), z: 0 }));

function track(fn, metric) {
  const t0 = Date.now();
  const r  = fn();
  metric.add(Date.now() - t0);
  return r;
}

function recordResult(r, tag) {
  const passed = check(r, {
    [`${tag}: status 2xx`]: (res) => res.status >= 200 && res.status < 300,
  });
  if (!passed) errorCount.add(1);
  successRate.add(passed ? 1 : 0);
  return passed;
}

export default function () {
  const vu = __VU;

  // ── Health (every VU, every iter) ─────────────────────────────────────────
  group('health', () => {
    const r = http.get(`${BASE}/api/health`);
    check(r, { 'health:200': (res) => res.status === 200 });
  });

  // ── Translate (heaviest — rotate payloads) ────────────────────────────────
  group('translate', () => {
    const payload = TRANSLATE_PAYLOADS[vu % TRANSLATE_PAYLOADS.length];
    const r = track(
      () => http.post(`${BASE}/api/translate`, JSON.stringify(payload), { headers: HEADERS }),
      translateP95
    );
    recordResult(r, 'translate');

    if (r.status === 200) {
      const body = r.json();
      check(r, {
        'translate: has history_entry': () => !!body.history_entry?.id,
        'translate: formality valid':   () => ['formal','informal','neutral'].includes(body.formality_level),
      });
    }
  });

  sleep(0.1);

  // ── Text-to-Sign ─────────────────────────────────────────────────────────
  group('text_to_sign', () => {
    const payload = TEXT_TO_SIGN_PAYLOADS[vu % TEXT_TO_SIGN_PAYLOADS.length];
    const r = track(
      () => http.post(`${BASE}/api/text-to-sign`, JSON.stringify(payload), { headers: HEADERS }),
      textToSignP95
    );
    recordResult(r, 'text_to_sign');

    if (r.status === 200) {
      const body = r.json();
      check(r, {
        'text_to_sign: word_sequence is array':  () => Array.isArray(body.word_sequence),
        'text_to_sign: polarity in [-1,1]':      () => body.sentiment?.polarity >= -1 && body.sentiment?.polarity <= 1,
        'text_to_sign: has history_entry':       () => !!body.history_entry?.id,
      });
    }
  });

  sleep(0.1);

  // ── Cultural Notes ────────────────────────────────────────────────────────
  group('cultural_notes', () => {
    const lang = CULTURAL_LANGS[vu % CULTURAL_LANGS.length];
    const r = track(
      () => http.get(`${BASE}/api/cultural-notes/${lang}`),
      culturalP95
    );
    recordResult(r, `cultural_notes/${lang}`);
  });

  // ── History ────────────────────────────────────────────────────────────────
  group('history', () => {
    const r = track(
      () => http.get(`${BASE}/api/history?entry_type=translation&limit=10`),
      historyP95
    );
    recordResult(r, 'history');
    if (r.status === 200) {
      check(r, { 'history: data is array': () => Array.isArray(r.json('data')) });
    }
  });

  // ── Phrasebook CRUD (1 in 3 VUs) ─────────────────────────────────────────
  if (vu % 3 === 0) {
    group('phrasebook', () => {
      // Create entry
      const tr = http.post(
        `${BASE}/api/translate`,
        JSON.stringify({ text: `VU${vu} load phrase ${Date.now()}`, target_lang: 'fr' }),
        { headers: HEADERS }
      );
      if (tr.status !== 200) return;

      const histId = tr.json('history_entry.id');
      if (!histId) return;

      // Save
      const saveR = track(
        () => http.post(`${BASE}/api/phrasebook`, JSON.stringify({ history_id: histId }), { headers: HEADERS }),
        phrasebookP95
      );
      check(saveR, { 'phrasebook/save: 200': (res) => res.status === 200 });

      // Patch SRS
      const patchR = http.patch(
        `${BASE}/api/phrasebook/${histId}`,
        JSON.stringify({ extra: { srs: { interval: 1, easiness: 2.5, repetitions: 1 } } }),
        { headers: HEADERS }
      );
      check(patchR, { 'phrasebook/patch: 200': (res) => res.status === 200 });

      // List
      const listR = http.get(`${BASE}/api/phrasebook`);
      if (listR.status === 200) {
        activePhrasebookEntries.add(listR.json('data').length);
      }

      // Delete
      http.del(`${BASE}/api/phrasebook/${histId}`);
    });
  }

  // ── Classify ──────────────────────────────────────────────────────────────
  group('classify', () => {
    const r = track(
      () => http.post(`${BASE}/api/sign/classify`, JSON.stringify({ right_hand: CLASSIFY_LANDMARKS }), { headers: HEADERS }),
      classifyP95
    );
    recordResult(r, 'classify');
  });

  sleep(0.2);
}

/**
 * Handle summary for the master report
 */
export function handleSummary(data) {
  const filename = __ENV.SUMMARY_PATH || './tests/k6/results/load-summary.json';
  return {
    [filename]: JSON.stringify(data),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
