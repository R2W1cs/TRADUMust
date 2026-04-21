/**
 * k6 Smoke Test — TraduMust API
 * Verifies every endpoint works correctly with minimal load (1 VU, 1 iteration).
 * Run: k6 run tests/k6/k6-smoke.js
 */

import http from 'k6/http';
import ws   from 'k6/ws';
import encoding from 'k6/encoding';
import { check, group } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────
const translateLatency   = new Trend('translate_latency_ms',   true);
const textToSignLatency  = new Trend('text_to_sign_latency_ms', true);
const historyLatency     = new Trend('history_latency_ms',     true);
const phrasebookLatency  = new Trend('phrasebook_latency_ms',  true);
const errors             = new Counter('api_errors');
const successRate        = new Rate('api_success_rate');

export const options = {
  vus:        1,
  iterations: 1,
  thresholds: {
    http_req_failed:        ['rate<0.40'],   // Allow for intentional negative tests (404/422)
    api_success_rate:       ['rate>=0.99'],
    translate_latency_ms:   ['p(95)<5000'],
    text_to_sign_latency_ms:['p(95)<3000'],
    history_latency_ms:     ['p(95)<500'],
    phrasebook_latency_ms:  ['p(95)<500'],
  },
};

const BASE   = 'http://127.0.0.1:8001';
const HEADERS = { 'Content-Type': 'application/json' };

function ok(r, tag) {
  const passed = check(r, {
    [`${tag}: status 200`]:         (res) => res.status === 200,
    [`${tag}: body is JSON`]:       (res) => { try { JSON.parse(res.body); return true; } catch { return false; } },
    [`${tag}: no error field`]:     (res) => !JSON.parse(res.body || '{}').error,
  });
  if (!passed) errors.add(1);
  successRate.add(passed);
  return passed;
}

export default function () {

  // ── 1. Health ──────────────────────────────────────────────────────────────
  group('Health', () => {
    const r = http.get(`${BASE}/api/health`);
    check(r, {
      'health: 200':             (res) => res.status  === 200,
      'health: status=ok':       (res) => res.json('status') === 'ok',
      'health: has version':     (res) => !!res.json('version'),
      'health: has timestamp':   (res) => typeof res.json('timestamp') === 'number',
    });
  });

  // ── 2. Translate ──────────────────────────────────────────────────────────
  group('Translate', () => {
    const langs = ['fr', 'es', 'ja', 'de', 'zh', 'ar', 'ko', 'it', 'pt', 'en'];
    langs.forEach(lang => {
      const t0 = Date.now();
      const r = http.post(
        `${BASE}/api/translate`,
        JSON.stringify({ text: 'Good morning', target_lang: lang }),
        { headers: HEADERS }
      );
      translateLatency.add(Date.now() - t0);

      const body = r.json();
      ok(r, `translate/${lang}`);
      check(r, {
        [`translate/${lang}: has translated_text`]:  () => !!body.translated_text,
        [`translate/${lang}: has cultural_note`]:    () => !!body.cultural_note,
        [`translate/${lang}: has formality_level`]:  () => ['formal','informal','neutral'].includes(body.formality_level),
        [`translate/${lang}: has history_entry`]:    () => !!body.history_entry,
        [`translate/${lang}: history_entry has id`]: () => !!body.history_entry?.id,
      });
    });

    // 422 on empty text
    const bad = http.post(`${BASE}/api/translate`, JSON.stringify({ text: '', target_lang: 'fr' }), { headers: HEADERS });
    check(bad, { 'translate: empty → 422': (res) => res.status === 422 });
  });

  // ── 3. Text-to-Sign ───────────────────────────────────────────────────────
  group('Text-to-Sign', () => {
    const sentences = [
      'Hello my name is Alex',
      'I want to learn sign language today',
      'Where is the nearest bathroom?',
      'Thank you for your help',
    ];
    sentences.forEach(text => {
      const t0 = Date.now();
      const r = http.post(`${BASE}/api/text-to-sign`, JSON.stringify({ text, sign_language: 'ASL' }), { headers: HEADERS });
      textToSignLatency.add(Date.now() - t0);

      const body = r.json();
      ok(r, 'text-to-sign');
      check(r, {
        'text-to-sign: has word_sequence':      () => Array.isArray(body.word_sequence),
        'text-to-sign: has animation_clips':    () => Array.isArray(body.animation_clips),
        'text-to-sign: has sentiment':          () => typeof body.sentiment?.polarity === 'number',
        'text-to-sign: has history_entry':      () => !!body.history_entry,
        'text-to-sign: history_entry type':     () => body.history_entry?.entry_type === 'sign_expression',
        'text-to-sign: words are uppercase':    () => body.word_sequence.every(w => w === w.toUpperCase()),
      });
    });

    const bad = http.post(`${BASE}/api/text-to-sign`, JSON.stringify({ text: '' }), { headers: HEADERS });
    check(bad, { 'text-to-sign: empty → 422': (res) => res.status === 422 });
  });

  // ── 4. Cultural Notes ─────────────────────────────────────────────────────
  group('Cultural Notes', () => {
    const r = http.get(`${BASE}/api/cultural-notes/fr`);
    const body = r.json();
    ok(r, 'cultural-notes/fr');
    check(r, {
      'cultural-notes: has quick_tips':       () => Array.isArray(body.extended?.quick_tips),
      'cultural-notes: has academic_phrases': () => Array.isArray(body.extended?.academic_phrases),
    });

    const notFound = http.get(`${BASE}/api/cultural-notes/xx`);
    check(notFound, { 'cultural-notes: unknown → 404': (res) => res.status === 404 });
  });

  // ── 5. History ────────────────────────────────────────────────────────────
  group('History', () => {
    // First create a translation to populate history
    http.post(`${BASE}/api/translate`, JSON.stringify({ text: 'Hello smoke test', target_lang: 'fr' }), { headers: HEADERS });

    const t0   = Date.now();
    const r    = http.get(`${BASE}/api/history?entry_type=translation&limit=5`);
    historyLatency.add(Date.now() - t0);

    const body = r.json();
    ok(r, 'history');
    check(r, {
      'history: has data array': () => Array.isArray(body.data),
      'history: data not empty': () => body.data.length > 0,
      'history: entry has id':   () => !!body.data[0]?.id,
      'history: entry_type filter works': () => body.data.every(e => e.entry_type === 'translation'),
    });
  });

  // ── 6. Phrasebook ─────────────────────────────────────────────────────────
  group('Phrasebook', () => {
    // Create a history entry first
    const tr = http.post(`${BASE}/api/translate`, JSON.stringify({ text: 'Phrasebook smoke', target_lang: 'ja' }), { headers: HEADERS });
    const historyId = tr.json('history_entry.id');

    // Save to phrasebook
    const t0 = Date.now();
    const saveR = http.post(`${BASE}/api/phrasebook`, JSON.stringify({ history_id: historyId }), { headers: HEADERS });
    phrasebookLatency.add(Date.now() - t0);
    check(saveR, {
      'phrasebook/save: 200':           (res) => res.status === 200,
      'phrasebook/save: entry.id':      (res) => !!res.json('entry.id'),
      'phrasebook/save: isPhrasebook':  (res) => res.json('entry.isPhrasebook') === true,
    });

    // Get phrasebook list
    const listR = http.get(`${BASE}/api/phrasebook`);
    check(listR, {
      'phrasebook/list: 200':      (res) => res.status === 200,
      'phrasebook/list: has data': (res) => Array.isArray(res.json('data')),
    });

    // PATCH SRS
    const patchR = http.patch(
      `${BASE}/api/phrasebook/${historyId}`,
      JSON.stringify({ extra: { srs: { interval: 1, easiness: 2.5, repetitions: 0 } } }),
      { headers: HEADERS }
    );
    check(patchR, { 'phrasebook/patch: 200': (res) => res.status === 200 });

    // DELETE (un-phrasebook)
    const delR = http.del(`${BASE}/api/phrasebook/${historyId}`);
    check(delR, {
      'phrasebook/delete: 200':     (res) => res.status === 200,
      'phrasebook/delete: deleted': (res) => res.json('deleted') === true,
    });

    // 422 on missing history_id
    const badR = http.post(`${BASE}/api/phrasebook`, JSON.stringify({ history_id: '' }), { headers: HEADERS });
    check(badR, { 'phrasebook: empty history_id → 422': (res) => res.status === 422 });

    // 404 on unknown ID
    const missingR = http.post(`${BASE}/api/phrasebook`, JSON.stringify({ history_id: 'deadbeef00000000000000000000ffff' }), { headers: HEADERS });
    check(missingR, { 'phrasebook: unknown id → 404': (res) => res.status === 404 });
  });

  // ── 7. Sign — Extract Landmarks ──────────────────────────────────────────
  group('Sign / Extract Landmarks', () => {
    const fakeFrame = encoding.b64encode('\xFF\xD8\xFF' + '\x00'.repeat(100));
    const r = http.post(`${BASE}/api/sign/extract-landmarks`, JSON.stringify({ frame_b64: fakeFrame, width: 640, height: 480 }), { headers: HEADERS });
    check(r, {
      'landmarks: 200':               (res) => res.status === 200,
      'landmarks: hand_detected':     (res) => typeof res.json('hand_detected') === 'boolean',
      'landmarks: confidence in [0,1]':(res) => { const c = res.json('confidence'); return c >= 0 && c <= 1; },
    });

    const bad = http.post(`${BASE}/api/sign/extract-landmarks`, JSON.stringify({ frame_b64: 'not!!!base64', width: 640, height: 480 }), { headers: HEADERS });
    check(bad, { 'landmarks: bad base64 → 422': (res) => res.status === 422 });
  });

  // ── 8. Sign — Classify ────────────────────────────────────────────────────
  group('Sign / Classify', () => {
    const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0.0 }));
    const r = http.post(`${BASE}/api/sign/classify`, JSON.stringify({ right_hand: lm }), { headers: HEADERS });
    const body = r.json();
    check(r, {
      'classify: 200':                     (res) => res.status === 200,
      'classify: has predicted_sign':      () => typeof body.predicted_sign === 'string',
      'classify: confidence in [0,1]':     () => body.confidence >= 0 && body.confidence <= 1,
      'classify: 3 alternatives':          () => body.alternatives?.length === 3,
    });

    const emptyR = http.post(`${BASE}/api/sign/classify`, JSON.stringify({ right_hand: [], left_hand: [], landmarks: [] }), { headers: HEADERS });
    check(emptyR, { 'classify: empty → 422': (res) => res.status === 422 });
  });
}

/**
 * Handle summary for the master report
 */
export function handleSummary(data) {
  const filename = __ENV.SUMMARY_PATH || './tests/k6/results/smoke_summary.json';
  return {
    [filename]: JSON.stringify(data),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
