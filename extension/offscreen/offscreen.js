/**
 * SignBridge — Offscreen Document Script
 *
 * Runs in Chrome's offscreen context which has access to getUserMedia
 * (for tab capture streams) and Web Audio API.
 *
 * Current responsibilities:
 *  1. Receive tab MediaStream ID from the service worker
 *  2. Open the tab audio stream via getUserMedia with chromeMediaSource
 *  3. Compute audio level (RMS) and send back to SW for UI feedback
 *  4. Forward stream metadata to the service worker
 *
 * Planned (v1.1):
 *  - Route tab audio through a Whisper WASM model for fully offline ASR
 *  - This would eliminate the need for platform caption DOM scraping
 *    and provide truly universal audio-to-sign translation
 *
 * Privacy:
 *  - Tab audio is captured but NEVER stored or sent remotely
 *  - Audio processing happens entirely in this browser context
 *  - The stream is destroyed when capture is stopped
 */

'use strict';

let currentStream  = null;
let audioCtx       = null;
let analyser       = null;
let levelInterval  = null;
let currentTabId   = null;

// ── Message handler (receives from service worker) ────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {

    case 'INIT_CAPTURE':
      initCapture(message.streamId, message.tabId)
        .then(() => sendResponse({ ok: true }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
      return true; // async

    case 'STOP_CAPTURE':
      if (message.tabId === currentTabId || !message.tabId) {
        stopCapture();
        sendResponse({ ok: true });
      }
      break;

    default:
      break;
  }
});

// ── Tab audio capture ─────────────────────────────────────────────────────────
async function initCapture(streamId, tabId) {
  // Stop any existing capture
  if (currentStream) stopCapture();

  currentTabId = tabId;

  try {
    // Get the tab audio stream using the stream ID from tabCapture.getMediaStreamId()
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource:   'tab',
          chromeMediaSourceId: streamId,
        },
      },
      video: false,
    });

    currentStream = stream;
    setupAudioAnalysis(stream);

    console.log('[SignBridge Offscreen] Tab audio stream initialized for tab', tabId);

    // Notify the service worker that capture is live
    chrome.runtime.sendMessage({
      type:  'CAPTURE_STARTED',
      tabId: tabId,
    });

  } catch (err) {
    console.warn('[SignBridge Offscreen] getUserMedia failed:', err.message);
    // Signal the service worker to fall back to microphone Web Speech API
    chrome.runtime.sendMessage({
      type:  'CAPTURE_FAILED',
      tabId: tabId,
      error: err.message,
      fallbackToMic: true,
    });
    throw err;
  }
}

function stopCapture() {
  clearInterval(levelInterval);
  levelInterval = null;

  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
    currentStream = null;
  }

  if (audioCtx && audioCtx.state !== 'closed') {
    audioCtx.close().catch(() => {});
    audioCtx = null;
    analyser = null;
  }

  console.log('[SignBridge Offscreen] Capture stopped');
}

// ── Audio level analysis ──────────────────────────────────────────────────────
// Computes RMS audio level at 100ms intervals and sends to the SW.
// The SW forwards this to the content script for the animated waveform/mic icon.
function setupAudioAnalysis(stream) {
  try {
    audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    levelInterval = setInterval(() => {
      if (!analyser) return;
      analyser.getByteFrequencyData(dataArray);

      // RMS level
      const rms = Math.sqrt(
        dataArray.reduce((sum, v) => sum + v * v, 0) / dataArray.length
      );
      const level = Math.min(1, rms / 128);

      // Send level to SW (used for UI mic animation — future enhancement)
      chrome.runtime.sendMessage({
        type:   'AUDIO_LEVEL',
        tabId:  currentTabId,
        level:  level,
      }).catch(() => {}); // SW might not be listening

    }, 100);

  } catch (err) {
    console.warn('[SignBridge Offscreen] Web Audio setup failed:', err.message);
  }
}
