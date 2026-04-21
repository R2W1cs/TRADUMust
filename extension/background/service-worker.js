/**
 * SignBridge — Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 *  1. Coordinate tab audio capture via chrome.tabCapture
 *  2. Route messages between content scripts, popup, side panel, and offscreen doc
 *  3. Manage per-tab state (active capture session, avatar enabled flag)
 *  4. Handle keyboard command shortcuts
 *  5. Open the side panel when the extension icon is clicked
 *
 * Architecture note:
 *   MV3 service workers are ephemeral — they spin up on demand and may be
 *   terminated at any time. We persist all state to chrome.storage.session
 *   so it survives worker restarts within a browser session.
 *
 * Audio capture flow:
 *   Content script → "START_CAPTURE" → SW calls tabCapture.getMediaStreamId()
 *   → SW creates offscreen document → passes streamId to offscreen.js
 *   → offscreen.js processes audio, sends transcriptions back
 *   → SW forwards transcription to content script via chrome.tabs.sendMessage
 */

'use strict';

// ─── State ───────────────────────────────────────────────────────────────────
// In-memory map for the current SW lifetime.
// All mutations are also written to chrome.storage.session so state survives
// the silent restarts that MV3 service workers undergo between events.
const tabState = new Map();

async function loadTabState() {
  try {
    const { _sbTabState } = await chrome.storage.session.get('_sbTabState');
    if (_sbTabState) {
      for (const [k, v] of Object.entries(_sbTabState)) {
        tabState.set(Number(k), v);
      }
    }
  } catch { /* storage.session not available on older Chrome builds */ }
}

function persistTabState() {
  try {
    const obj = {};
    for (const [k, v] of tabState) obj[k] = v;
    chrome.storage.session.set({ _sbTabState: obj }).catch(() => {});
  } catch {}
}

// Hydrate from storage immediately when the SW starts
loadTabState();

// ─── Extension lifecycle ──────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.log('[SignBridge] Installed — welcome to SignBridge 🤟');
    // Set default storage values on first install
    chrome.storage.sync.set({
      avatarEnabled:        true,
      avatarSize:           280,
      avatarOpacity:        0.95,
      captionSource:        'auto',
      animationSpeed:       1.0,
      showCaptions:         true,
      showHints:            true,
      handedness:           'right',
      phrasebookEnabled:    true,
      educationalPanelOpen: false,
    });
  }
  if (reason === 'update') {
    console.log('[SignBridge] Updated to v' + chrome.runtime.getManifest().version);
  }
});

// ─── Side panel behaviour ─────────────────────────────────────────────────────
// Open the side panel automatically when the user clicks the action icon.
// This pairs with the popup that shows on first click for quick controls.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
  .catch(() => { /* API might not be available in all Chrome builds */ });

// ─── Message routing ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (message.type) {
    // ── Content script wants to start audio capture ──────────────────────────
    case 'START_CAPTURE':
      handleStartCapture(tabId, sendResponse);
      return true; // keep channel open for async response

    // ── Content script wants to stop capture ────────────────────────────────
    case 'STOP_CAPTURE':
      handleStopCapture(tabId);
      sendResponse({ ok: true });
      break;

    // ── Offscreen doc sends back a transcription chunk ───────────────────────
    case 'TRANSCRIPTION':
      forwardTranscriptionToTab(message.tabId, message.text, message.isFinal);
      break;

    // ── Popup / side panel queries current tab state ─────────────────────────
    case 'GET_STATUS':
      getCurrentTabStatus().then(sendResponse);
      return true;

    // ── Popup toggles the avatar on/off for the current tab ──────────────────
    case 'TOGGLE_AVATAR':
      toggleAvatarOnCurrentTab(message.enabled);
      sendResponse({ ok: true });
      break;

    // ── Side panel opens — tell it the current platform ──────────────────────
    case 'GET_PLATFORM_INFO':
      getPlatformInfo(tabId).then(sendResponse);
      return true;

    default:
      break;
  }
});

// ─── Keyboard commands ────────────────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (command === 'toggle-avatar') {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_AVATAR' }).catch(() => {
      // Content script not present on this tab — ignore
    });
  }
  if (command === 'toggle-captions') {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_CAPTIONS' }).catch(() => {});
  }
});

// ─── Tab cleanup ──────────────────────────────────────────────────────────────
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabState.has(tabId)) {
    tabState.delete(tabId);
    persistTabState();
  }
});

// ─── Capture handlers ─────────────────────────────────────────────────────────
async function handleStartCapture(tabId, sendResponse) {
  if (!tabId) {
    sendResponse({ ok: false, error: 'No tab ID' });
    return;
  }

  // Avoid double-capturing the same tab
  const state = tabState.get(tabId) || {};
  if (state.captureActive) {
    sendResponse({ ok: true, alreadyActive: true });
    return;
  }

  try {
    // Get a MediaStream ID that can be consumed in the offscreen document
    // Note: getMediaStreamId is available in MV3 service workers (Chrome 116+)
    const streamId = await new Promise((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(id);
      });
    });

    // Persist state
    tabState.set(tabId, { captureActive: true, streamId, offscreenCreated: false });
    persistTabState();

    // Create or reuse the offscreen document for audio processing
    await ensureOffscreenDocument();

    // Give the offscreen document a moment to register its message listener
    // before sending INIT_CAPTURE — the document may have just been created.
    await new Promise(r => setTimeout(r, 150));

    // Tell the offscreen doc which stream to capture
    chrome.runtime.sendMessage({
      type:     'INIT_CAPTURE',
      streamId: streamId,
      tabId:    tabId,
    }).catch((err) => {
      // Offscreen doc not yet listening — not fatal; it will request the streamId
      // again on its own onMessage listener when ready.
      console.warn('[SignBridge SW] INIT_CAPTURE delivery failed:', err.message);
    });

    tabState.get(tabId).offscreenCreated = true;
    persistTabState();
    sendResponse({ ok: true, streamId });

  } catch (err) {
    console.warn('[SignBridge SW] tabCapture failed:', err.message);
    // Fall back to microphone-based Web Speech API in content script
    sendResponse({ ok: false, error: err.message, fallbackToMic: true });
  }
}

function handleStopCapture(tabId) {
  if (!tabId) return;
  const state = tabState.get(tabId);
  if (state?.captureActive) {
    tabState.set(tabId, { ...state, captureActive: false });
    persistTabState();
    chrome.runtime.sendMessage({ type: 'STOP_CAPTURE', tabId }).catch(() => {});
  }
}

function forwardTranscriptionToTab(tabId, text, isFinal) {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, {
    type: 'TRANSCRIPTION',
    text,
    isFinal,
  }).catch(() => {
    // Content script may not be ready yet — silently ignore
  });
}

async function getCurrentTabStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return { active: false, platform: 'unknown', tabId: null };

  const state = tabState.get(tab.id) || {};
  const settings = await chrome.storage.sync.get(['avatarEnabled']);

  return {
    active:       state.captureActive || false,
    avatarEnabled: settings.avatarEnabled ?? true,
    tabId:        tab.id,
    tabUrl:       tab.url,
    platform:     detectPlatformFromUrl(tab.url),
  };
}

async function toggleAvatarOnCurrentTab(enabled) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  await chrome.storage.sync.set({ avatarEnabled: enabled });
  chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_AVATAR', enabled }).catch(() => {});
}

async function getPlatformInfo(tabId) {
  if (!tabId) return { platform: 'unknown' };
  try {
    const tab = await chrome.tabs.get(tabId);
    return { platform: detectPlatformFromUrl(tab.url), url: tab.url };
  } catch {
    return { platform: 'unknown' };
  }
}

// ─── Offscreen document management ───────────────────────────────────────────
let offscreenDocumentCreating = false;

async function ensureOffscreenDocument() {
  // Check if we already have an offscreen document
  const existing = await chrome.offscreen.hasDocument?.().catch(() => false);
  if (existing) return;

  // Prevent race conditions
  if (offscreenDocumentCreating) {
    await new Promise(r => setTimeout(r, 200));
    return;
  }

  offscreenDocumentCreating = true;
  try {
    await chrome.offscreen.createDocument({
      url:    'offscreen/offscreen.html',
      reasons: [chrome.offscreen.Reason.USER_MEDIA, chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: 'Capture and transcribe tab audio for sign language avatar',
    });
  } catch (err) {
    console.warn('[SignBridge SW] Could not create offscreen document:', err.message);
  } finally {
    offscreenDocumentCreating = false;
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function detectPlatformFromUrl(url = '') {
  if (url.includes('youtube.com'))         return 'youtube';
  if (url.includes('meet.google.com'))     return 'google-meet';
  if (url.includes('zoom.us'))             return 'zoom';
  if (url.includes('teams.microsoft.com'))  return 'microsoft-teams';
  if (url.includes('teams.live.com'))       return 'microsoft-teams';
  if (url.includes('teams.cloud.microsoft')) return 'microsoft-teams';
  return 'unknown';
}
