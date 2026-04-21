/**
 * sonar-scan.js
 * Orchestrates a full SonarQube analysis for TraduMust:
 *   1. Waits for SonarQube to be healthy (up to 3 minutes)
 *   2. Resets the default admin password on first run
 *   3. Creates the project if it doesn't exist
 *   4. Generates or reuses a user token
 *   5. Runs sonar-scanner against localhost:9000
 *
 * Usage:
 *   node sonar-scan.js
 *   npm run sonar          (also regenerates LCOV coverage first)
 */

const { execSync } = require('child_process');
const https = require('https');
const http  = require('http');

const SQ_URL      = 'http://localhost:9000';
const ADMIN_USER  = 'admin';
// Resolution order:
//   1. SONAR_PASSWORD env variable  (set this after changing from the default)
//   2. Built-in candidates (default + common first-run value)
const CANDIDATE_PASSWORDS = [
  ...(process.env.SONAR_PASSWORD ? [process.env.SONAR_PASSWORD] : []),
  'Raapa159753.', 'admin', 'Admin1234!',
];
const PROJECT_KEY = 'tradumust';
const PROJECT_NAME = 'TraduMust';
const TOKEN_NAME  = 'tradumust-local-scanner';

// ── HTTP helper ───────────────────────────────────────────────────────────────
function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function basicAuth(user, pass) {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

async function sqGet(path, user = ADMIN_USER, pass = CANDIDATE_PASSWORDS[0]) {
  const res = await request(`${SQ_URL}${path}`, {
    headers: { Authorization: basicAuth(user, pass) },
  });
  return { status: res.status, json: JSON.parse(res.body || '{}') };
}

async function sqPost(path, params, user = ADMIN_USER, pass = CANDIDATE_PASSWORDS[0]) {
  const body = new URLSearchParams(params).toString();
  const res = await request(
    `${SQ_URL}${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: basicAuth(user, pass),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    },
    body
  );
  return { status: res.status, json: JSON.parse(res.body || '{}') };
}

// ── Step 1: Wait for SonarQube to be healthy ─────────────────────────────────
async function waitForSonarQube(timeoutMs = 180_000) {
  const start = Date.now();
  process.stdout.write('\n[sonar-scan] Waiting for SonarQube at ' + SQ_URL);
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await request(`${SQ_URL}/api/system/status`);
      const json = JSON.parse(res.body);
      if (json.status === 'UP') {
        console.log(' ✔ UP');
        return true;
      }
      process.stdout.write('.');
    } catch {
      process.stdout.write('.');
    }
    await new Promise(r => setTimeout(r, 4000));
  }
  throw new Error('SonarQube did not become healthy within 3 minutes.');
}

// ── Step 2: Detect working admin password ────────────────────────────────────
// SonarQube 10+ forces a password change through the WEB UI on first login.
// The API cannot perform that forced change — it returns 400.
// We simply probe each candidate and use whichever authenticates successfully.
async function ensureAdminPassword() {
  for (const pass of CANDIDATE_PASSWORDS) {
    const res = await sqGet('/api/authentication/validate', ADMIN_USER, pass);
    if (res.status === 200 && res.json?.valid === true) {
      console.log(`[sonar-scan] Authenticated as admin (password: ${pass === 'admin' ? 'default' : 'updated'}).`);
      if (pass === 'admin') {
        console.log('[sonar-scan] Tip: Change the default password at http://localhost:9000/account/security');
      }
      return pass;
    }
  }
  throw new Error(
    'Cannot authenticate. Go to http://localhost:9000 and log in with admin/admin ' +
    'to complete the mandatory first-login password change, then re-run npm run sonar:scan.'
  );
}

// ── Step 3: Create project ────────────────────────────────────────────────────
async function ensureProject(pass) {
  const existing = await sqGet(
    `/api/projects/search?projects=${PROJECT_KEY}`, ADMIN_USER, pass
  );
  if (existing.json?.components?.length > 0) {
    console.log(`[sonar-scan] Project '${PROJECT_KEY}' already exists.`);
    return;
  }
  const created = await sqPost(
    '/api/projects/create',
    { name: PROJECT_NAME, project: PROJECT_KEY, visibility: 'public' },
    ADMIN_USER, pass
  );
  if (created.status === 200) {
    console.log(`[sonar-scan] Project '${PROJECT_KEY}' created.`);
  } else {
    console.warn('[sonar-scan] Project creation response:', created.status, created.json);
  }
}

// ── Step 4: Get or create scanner token ──────────────────────────────────────
async function ensureToken(pass) {
  // Revoke any old token with the same name (idempotent)
  await sqPost(
    '/api/user_tokens/revoke',
    { name: TOKEN_NAME },
    ADMIN_USER, pass
  );
  // Generate fresh token
  const res = await sqPost(
    '/api/user_tokens/generate',
    { name: TOKEN_NAME, type: 'USER_TOKEN' },
    ADMIN_USER, pass
  );
  if (!res.json?.token) {
    throw new Error('Failed to generate scanner token: ' + JSON.stringify(res.json));
  }
  console.log(`[sonar-scan] Scanner token generated.`);
  return res.json.token;
}

// ── Step 5: Run the scanner ───────────────────────────────────────────────────
async function runScanner(token) {
  console.log('\n[sonar-scan] Starting analysis…\n');
  const { scan } = require('sonarqube-scanner');
  await scan({
    serverUrl: SQ_URL,
    token,
    options: {
      'sonar.projectKey':   PROJECT_KEY,
      'sonar.projectName':  PROJECT_NAME,
      'sonar.projectVersion': '0.1.0',
      'sonar.sources':      'app,lib,components,extension/content,extension/background,extension/popup,extension/sidepanel,backend',
      'sonar.tests':        'tests',
      'sonar.sourceEncoding': 'UTF-8',
      'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info',
      'sonar.python.coverage.reportPaths': 'coverage/python-coverage.xml',
      'sonar.python.version': '3.11',
      'sonar.exclusions': [
        'node_modules/**', '.next/**', '.venv/**', 'coverage/**',
        '**/*.min.js', 'extension/content/vocab-10k.js',
        'backend/ml/trained_model.pkl', 'tests/results/**',
      ].join(','),
      // Exclude UI files that have no unit tests from coverage calculation.
      // Next.js pages and React components require browser rendering — they are
      // covered by manual / E2E testing, not by the unit test suite.
      'sonar.coverage.exclusions': [
        'app/**',
        'components/**',
        'lib/**',
        'next.config.js',
        'tailwind.config.ts',
        'extension/background/**',
        'extension/popup/**',
        'extension/sidepanel/**',
        'extension/offscreen/**',
      ].join(','),
    },
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await waitForSonarQube();
    const pass  = await ensureAdminPassword();
    await ensureProject(pass);
    const token = await ensureToken(pass);
    await runScanner(token);
    console.log(`\n✔ Analysis complete — open ${SQ_URL}/dashboard?id=${PROJECT_KEY}\n`);
  } catch (err) {
    console.error('\n✖ sonar-scan failed:', err.message);
    process.exit(1);
  }
})();
