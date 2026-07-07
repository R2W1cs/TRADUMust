/**
 * SignBridge D2 — Sign-to-Text Recognizer (iframe)
 * Runs inside extension/d2/recognizer.html.
 *
 * Pipeline:
 *   Webcam → MediaPipe GestureRecognizer → classifyLandmarks() → postMessage to parent
 *
 * Parent (content script) receives:
 *   { type: 'SB_SIGN', key: string, label: string, confidence: number }
 *   { type: 'SB_SIGN_CLEARED' }
 */

import { classifyLandmarks, motionFromBuffer } from './classifier.js';
import { GestureRecognizer, FilesetResolver } from './lib/mediapipe-vision.mjs';

// WASM assets are fetched via connect-src (not script-src) — CDN is permitted
const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm';

// ── Config ────────────────────────────────────────────────────────────────────
const MOTION_BUF_SIZE   = 40;
const HOLD_FRAMES_NEEDED = 5;   // consecutive matching frames before emitting
const CLEAR_AFTER_MS    = 1800; // clear caption after this idle period

// ── State ─────────────────────────────────────────────────────────────────────
let recognizer    = null;
let videoEl       = null;
let canvasEl      = null;
let canvasCtx     = null;
let animFrameId   = null;
let lastVideoTime = -1;
let motionBuf     = [];
let holdCount     = 0;
let lastKey       = null;
let clearTimer    = null;
let modelReady    = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const loadingEl   = document.getElementById('loading-msg');
const detectedEl  = document.getElementById('detected-sign');
const confEl      = document.getElementById('confidence');
const dotEl       = document.getElementById('active-dot');

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function init() {
  videoEl   = document.getElementById('webcam');
  canvasEl  = document.getElementById('overlay-canvas');
  canvasCtx = canvasEl.getContext('2d');

  try {
    // Camera stream
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, frameRate: 24 },
      audio: false,
    });
    videoEl.srcObject = stream;
    await new Promise(res => { videoEl.onloadedmetadata = res; });
    videoEl.play();

    updateStatus('loading-mp', 'Loading MediaPipe…');
    await loadMediaPipe();

    if (loadingEl) loadingEl.style.display = 'none';
    dotEl.classList.remove('inactive');
    modelReady = true;

    startLoop();
    console.log('[SignBridge D2] Ready');
  } catch (err) {
    console.error('[SignBridge D2] init failed:', err);
    if (loadingEl) {
      loadingEl.querySelector('span').textContent = `Camera error: ${err.message}`;
    }
  }
}

async function loadMediaPipe() {
  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);

  // Try extension model first, fall back to CDN
  let modelPath;
  try {
    modelPath = chrome.runtime.getURL('d2/models/gesture_recognizer.task');
  } catch {
    modelPath = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
  }

  recognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: { modelAssetPath: modelPath, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numHands: 2,
  });
}

// ── Inference loop ────────────────────────────────────────────────────────────

function startLoop() {
  const tick = () => {
    animFrameId = requestAnimationFrame(tick);
    if (!modelReady || !recognizer) return;
    if (videoEl.readyState < 2) return;
    if (videoEl.currentTime === lastVideoTime) return;

    lastVideoTime = videoEl.currentTime;

    // Resize canvas to match video
    if (canvasEl.width !== videoEl.videoWidth) {
      canvasEl.width  = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
    }

    const results = recognizer.recognizeForVideo(videoEl, performance.now());

    // Draw landmarks for visual feedback
    drawLandmarks(results);

    // Classify
    let detected = null;
    if (results.landmarks?.length > 0) {
      const lm1  = results.landmarks[0];
      const lm2  = results.landmarks[1] || null;
      const palm = lm1[0];

      motionBuf.push({ x: palm.x, y: palm.y, time: performance.now() });
      if (motionBuf.length > MOTION_BUF_SIZE) motionBuf.shift();

      detected = classifyLandmarks(lm1, motionBuf, lm2);
    } else {
      motionBuf = [];
    }

    if (detected) {
      if (detected.key === lastKey) {
        holdCount++;
      } else {
        holdCount = 1;
        lastKey   = detected.key;
      }

      if (holdCount >= HOLD_FRAMES_NEEDED) {
        emitSign(detected);
        resetClearTimer();
      }
    } else {
      holdCount = 0;
    }
  };

  animFrameId = requestAnimationFrame(tick);
}

// ── Landmark drawing ──────────────────────────────────────────────────────────

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],          // thumb
  [0,5],[5,6],[6,7],[7,8],          // index
  [0,9],[9,10],[10,11],[11,12],     // middle
  [0,13],[13,14],[14,15],[15,16],   // ring
  [0,17],[17,18],[18,19],[19,20],  // pinky
  [5,9],[9,13],[13,17],             // palm cross-connections
];

function drawLandmarks(results) {
  canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  if (!results.landmarks?.length) return;

  const W = canvasEl.width, H = canvasEl.height;

  for (const lm of results.landmarks) {
    // Draw connections
    canvasCtx.strokeStyle = 'rgba(130,100,255,0.6)';
    canvasCtx.lineWidth   = 1.5;
    for (const [a, b] of CONNECTIONS) {
      canvasCtx.beginPath();
      canvasCtx.moveTo(lm[a].x * W, lm[a].y * H);
      canvasCtx.lineTo(lm[b].x * W, lm[b].y * H);
      canvasCtx.stroke();
    }

    // Draw dots
    for (const pt of lm) {
      canvasCtx.beginPath();
      canvasCtx.arc(pt.x * W, pt.y * H, 3, 0, Math.PI * 2);
      canvasCtx.fillStyle = 'rgba(200,180,255,0.9)';
      canvasCtx.fill();
    }
  }
}

// ── Output ────────────────────────────────────────────────────────────────────

function emitSign({ key, label, confidence }) {
  if (detectedEl) detectedEl.textContent = label || key;
  if (confEl) confEl.textContent = `${Math.round(confidence * 100)}%`;

  window.parent.postMessage({
    type: 'SB_SIGN',
    key,
    label,
    confidence,
  }, '*');
}

function resetClearTimer() {
  clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    lastKey   = null;
    holdCount = 0;
    if (detectedEl) detectedEl.textContent = '—';
    if (confEl) confEl.textContent = '';
    window.parent.postMessage({ type: 'SB_SIGN_CLEARED' }, '*');
  }, CLEAR_AFTER_MS);
}

function updateStatus(state, msg) {
  const span = loadingEl?.querySelector('span');
  if (span) span.textContent = msg;
}

// ── Message listener (from parent) ───────────────────────────────────────────

window.addEventListener('message', (e) => {
  if (e.source !== window.parent) return;
  const { type } = e.data || {};

  if (type === 'SB_D2_STOP') {
    cancelAnimationFrame(animFrameId);
    videoEl?.srcObject?.getTracks().forEach(t => t.stop());
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
init();
