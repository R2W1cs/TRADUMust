/**
 * SignBridge — Popup JS
 *
 * Controls the extension popup UI. Reads/writes chrome.storage.sync,
 * queries the active tab's content script, and drives UI state.
 */

'use strict';

const PLATFORM_ICONS = {
  'youtube':          '▶️',
  'google-meet':      '📹',
  'zoom':             '🎥',
  'microsoft-teams':  '🟦',
  'unknown':          '🌐',
};

const STRATEGY_LABELS = {
  'dom':    'Platform captions',
  'speech': 'Microphone (Web Speech)',
  'none':   '—',
};

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await refreshTabStatus();
  attachListeners();
});

// ── Load settings from storage ────────────────────────────────────────────────
async function loadSettings() {
  const s = await storageGet([
    'avatarEnabled', 'showCaptions', 'showHints',
    'animationSpeed', 'captionSource',
  ]);

  el('toggle-avatar').checked   = s.avatarEnabled   ?? true;
  el('toggle-captions').checked = s.showCaptions    ?? true;
  el('toggle-hints').checked    = s.showHints       ?? true;
  el('speed-select').value      = String(s.animationSpeed ?? 1.0);
  el('source-select').value     = s.captionSource   ?? 'auto';

  updateBadge(s.avatarEnabled);
}

// ── Query the active tab ──────────────────────────────────────────────────────
async function refreshTabStatus() {
  const tab = await getActiveTab();
  if (!tab) return;

  const platformId = detectPlatformFromUrl(tab.url || '');

  // Platform bar
  el('platform-icon').textContent = PLATFORM_ICONS[platformId] || '🌐';
  el('platform-name').textContent = PLATFORM_DISPLAY_NAMES[platformId] || 'Unsupported page';

  // Caption tip
  el('caption-instructions').textContent =
    CAPTION_INSTRUCTIONS[platformId] ||
    'Navigate to YouTube, Google Meet, Zoom, or Microsoft Teams to use SignBridge.';

  // Query content script for live status
  try {
    const response = await tabMessage(tab.id, { type: 'GET_STATUS' });
    if (response?.strategy) {
      el('strategy-label').textContent = STRATEGY_LABELS[response.strategy] || '';
    }
    if (response?.captureActive) {
      el('status-badge').textContent = 'Capturing';
      el('status-badge').className = 'sb-badge sb-badge--capturing';
    }
  } catch {
    // Content script not injected on this page (non-supported platform)
    el('status-badge').textContent = 'Not available';
    el('status-badge').className = 'sb-badge sb-badge--inactive';
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────
function attachListeners() {

  el('toggle-avatar').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.sync.set({ avatarEnabled: enabled });
    updateBadge(enabled);
    await sendToActiveTab({ type: 'TOGGLE_AVATAR', enabled });
  });

  el('toggle-captions').addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ showCaptions: e.target.checked });
  });

  el('toggle-hints').addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ showHints: e.target.checked });
  });

  el('speed-select').addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ animationSpeed: parseFloat(e.target.value) });
  });

  el('source-select').addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ captionSource: e.target.value });
  });

  el('btn-sidepanel').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.windowId) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      window.close();
    }
  });

  el('btn-phrasebook').addEventListener('click', () => {
    // Opens the side panel on the Phrasebook tab
    el('btn-sidepanel').click();
  });
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }

function updateBadge(enabled) {
  const badge = el('status-badge');
  if (!enabled) {
    badge.textContent = 'Disabled';
    badge.className = 'sb-badge sb-badge--inactive';
  } else {
    badge.textContent = 'Active';
    badge.className = 'sb-badge sb-badge--active';
  }
}

// ── Chrome API wrappers ───────────────────────────────────────────────────────
function storageGet(keys) {
  return new Promise(resolve => chrome.storage.sync.get(keys, resolve));
}

function getActiveTab() {
  return chrome.tabs.query({ active: true, currentWindow: true })
    .then(tabs => tabs[0] || null);
}

async function sendToActiveTab(message) {
  const tab = await getActiveTab();
  if (!tab?.id) return null;
  return tabMessage(tab.id, message);
}

function tabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, response => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(response);
    });
  });
}

// ── Platform detection (mirrors background/service-worker.js) ─────────────────
const PLATFORM_DISPLAY_NAMES = {
  'youtube':         'YouTube',
  'google-meet':     'Google Meet',
  'zoom':            'Zoom',
  'microsoft-teams': 'Microsoft Teams',
  'unknown':         'Unsupported page',
};

const CAPTION_INSTRUCTIONS = {
  'youtube':         'Click the CC button in the YouTube player controls to enable captions.',
  'google-meet':     'Click the three-dot menu → "Turn on captions".',
  'zoom':            'Click "CC" in the Zoom meeting toolbar to enable live transcription.',
  'microsoft-teams': 'Click "More" (···) → "Language and speech" → "Turn on live captions".',
};

function detectPlatformFromUrl(url) {
  if (url.includes('youtube.com'))         return 'youtube';
  if (url.includes('meet.google.com'))     return 'google-meet';
  if (url.includes('zoom.us'))             return 'zoom';
  if (url.includes('teams.microsoft.com')) return 'microsoft-teams';
  if (url.includes('teams.live.com'))      return 'microsoft-teams';
  return 'unknown';
}
