/**
 * SignBridge — Content Script (Main Orchestrator)
 *
 * Entry point that wires together all content-script modules:
 *
 *   PlatformDetector → identifies platform + caption selectors
 *   StorageManager   → loads user preferences
 *   SignMapper       → text → sign sequence
 *   AudioProcessor   → captions/speech → text stream
 *   AvatarRenderer   → sign config → SVG
 *   AvatarOverlay    → manages the floating UI panel
 *
 * Message handling:
 *   ← background SW sends TOGGLE_AVATAR, TOGGLE_CAPTIONS, TRANSCRIPTION
 *   → background SW receives START_CAPTURE, STOP_CAPTURE, GET_STATUS
 *
 * Privacy:
 *   No audio is recorded. No caption text leaves the device.
 *   Only anonymous UI preferences reach chrome.storage.sync.
 */

(function () {
  'use strict';

  // Guard: wait for modules to satisfy Isolated World execution
  let SB = window.SignBridge;
  
  async function ensureModules() {
    let retries = 5;
    while (!SB && retries > 0) {
      console.debug(`[SignBridge] Waiting for modules... (${retries} left)`);
      await new Promise(r => setTimeout(r, 200));
      SB = window.SignBridge;
      retries--;
    }
  }

  async function boot() {
    await ensureModules();
    if (!SB || !SB.PlatformDetector) {
      console.error('[SignBridge] Core modules failed to load. Extension disabled.');
      return;
    }

    // Assign to outer scope
    platform = SB.PlatformDetector.detect();
    StorageManager = SB.StorageManager;
    SignMapper = SB.SignMapper;
    AudioProcessor = SB.AudioProcessor;
    AvatarOverlay = SB.AvatarOverlay;

    console.log(`[SignBridge] Active on ${SB.PlatformDetector.getDisplayName() || 'Unknown'} (${platform})`);
    
    // Auto-init for supported environments
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      init();
    } else {
      document.addEventListener('DOMContentLoaded', init);
    }
  }

  let platform = 'unknown'; // placeholder, set in boot()
  let StorageManager, SignMapper, AudioProcessor, AvatarOverlay; // extracted in boot()

  let initialized   = false;
  let captureActive = false;

  // ── Init ──────────────────────────────────────────────────────────────────
  async function init() {
    if (initialized) return;
    initialized = true;

    const settings = await StorageManager.getAll();

    // Inject the avatar overlay into the page
    await AvatarOverlay.init();

    if (!settings.avatarEnabled) return;

    // Wire video pause/play to the avatar
    attachVideoListeners();

    // Start caption capture with a small delay to let the video page finish loading
    setTimeout(() => startCapture(settings), 1500);
  }

  // ── Video pause/play detection ────────────────────────────────────────────
  // When the user pauses the video the avatar returns to rest pose and stops.
  // When they resume the avatar becomes active again.
  function attachVideoListeners() {
    const selectors = platform === 'youtube'
      ? ['#movie_player video', '.html5-main-video', 'video']
      : (window.SignBridge.PlatformDetector.getVideoSelectors() || ['video']);

    let attached = [];

    function tryAttach() {
      for (const sel of selectors) {
        for (const vid of document.querySelectorAll(sel)) {
          if (attached.includes(vid)) continue;
          attached.push(vid);

          vid.addEventListener('pause', () => {
            AvatarOverlay.pauseSigning();
            AudioProcessor.stop();
          });

          vid.addEventListener('play', () => {
            AvatarOverlay.resumeSigning();
            const settings = StorageManager.getAll();
            settings.then(s => {
              if (!captureActive) {
                captureActive = true;
                AudioProcessor.start(onTextReceived, s.captionSource || 'auto');
              }
            });
          });

          vid.addEventListener('ended', () => {
            AvatarOverlay.pauseSigning();
          });
        }
      }
    }

    // Try immediately, then watch for the video element to appear (YouTube SPA)
    tryAttach();
    const vidObserver = new MutationObserver(tryAttach);
    vidObserver.observe(document.body, { childList: true, subtree: true });
  }

  // ── Caption capture ───────────────────────────────────────────────────────
  async function startCapture(settings) {
    if (captureActive) return;
    captureActive = true;

    // Try tab audio capture via background service worker first
    // (falls back automatically to Web Speech API if unavailable)
    const captionSource = settings.captionSource || 'auto';

    if (captionSource !== 'speech') {
      // Ask the service worker to start tab audio capture
      try {
        const response = await sendMessage({ type: 'START_CAPTURE' });
        if (response?.fallbackToMic) {
          console.log('[SignBridge] Tab capture unavailable — using Web Speech API');
        }
      } catch {
        console.log('[SignBridge] Service worker not available — using direct caption scraping');
      }
    }

    // Start the audio/caption processor (handles both DOM scraping and Web Speech)
    AudioProcessor.start(onTextReceived, captionSource);
  }

  function stopCapture() {
    if (!captureActive) return;
    captureActive = false;
    AudioProcessor.stop();
    sendMessage({ type: 'STOP_CAPTURE' }).catch(() => {});
  }

  // ── Text → signs pipeline ─────────────────────────────────────────────────
  let lastProcessedText = '';

  function onTextReceived(text, isFinal) {
    if (!text || text.trim().length < 2) return;

    // Update the caption display with raw text (Elite UI handles the tracking bubble)
    AvatarOverlay.updateCaption(text);

    // REAL-TIME STREAMING LOGIC
    // We compare the current (interim or final) text with the last processed text
    // and extract only the new words to avoid repeating signs.
    let newText = '';
    if (isFinal) {
      // For final results, we take everything that wasn't in the last final chunk
      newText = text;
      lastProcessedText = ''; // Reset for next utterance
    } else {
      // For interim results, we only take trailing words that haven't been signed yet
      if (text.startsWith(lastProcessedText)) {
        newText = text.slice(lastProcessedText.length).trim();
      } else {
        // Speech API changed its mind — restart the stream for this utterance
        newText = text;
      }
      lastProcessedText = text;
    }

    if (!newText || newText.length < 2) return;

    // Convert only the NEW text to sign sequence
    const signs = SignMapper.textToSigns(newText);
    if (signs.length === 0) return;

    // Append to existing queue for seamless flow
    AvatarOverlay.enqueueSignSequence(signs);

    // Notify the side panel
    chrome.runtime.sendMessage({
      type:  'SIGNS_UPDATED',
      signs: signs.map(s => ({
        key:          s._key,
        word:         s._word,
        gloss:        s.gloss,
        description:  s.description,
        culturalNote: s.culturalNote,
        category:     s.category,
      })),
    }).catch(() => {});
  }

  // ── Background message listener ───────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {

      case 'TOGGLE_AVATAR':
        if (message.enabled === false || AvatarOverlay._visible) {
          AvatarOverlay.hide();
        } else {
          AvatarOverlay.show();
        }
        sendResponse({ ok: true });
        break;

      case 'TOGGLE_CAPTIONS':
        StorageManager.get('showCaptions').then(({ showCaptions }) => {
          StorageManager.set({ showCaptions: !showCaptions });
        });
        sendResponse({ ok: true });
        break;

      case 'TRANSCRIPTION':
        // Forwarded transcription from offscreen document (via SW)
        onTextReceived(message.text, message.isFinal);
        sendResponse({ ok: true });
        break;

      case 'GET_STATUS':
        sendResponse({
          platform,
          captureActive,
          strategy: AudioProcessor.getStrategy(),
          queueLength: AvatarOverlay._signQueue?.length || 0,
        });
        break;

      case 'PREVIEW_SIGN':
        // Popup/sidepanel requests a sign preview
        if (message.key) {
          const sign = SignMapper.SIGNS[message.key];
          if (sign) {
            AvatarOverlay.clearQueue();
            AvatarOverlay.enqueueSign({ ...sign, _key: message.key, _word: sign.gloss || message.key });
          }
        }
        sendResponse({ ok: true });
        break;

      default:
        break;
    }
  });

  // ── Utility ───────────────────────────────────────────────────────────────
  function sendMessage(msg) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(msg, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  // On YouTube, the video player page loads dynamically via pushState — watch
  // for URL changes to re-initialize when navigating between videos.
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Give the new page a moment to render before re-initializing
      setTimeout(() => {
        if (!initialized) {
          init();
        } else {
          // Re-start caption scraping on the new page (same overlay, new DOM)
          AudioProcessor.stop();
          captureActive = false;
          StorageManager.getAll().then(s => startCapture(s));
        }
      }, 2000);
    }
  });
  urlObserver.observe(document, { subtree: true, childList: true });

  // Boot
  boot();

  // ── DevTools bridge ───────────────────────────────────────────────────────
  // Content scripts run in an ISOLATED world — window.SignBridge is not visible
  // to the page's DevTools console directly.
  // This injects a MAIN-world marker + a postMessage-based helper.
  // In DevTools: window.SignBridgeDebug.textToSigns("hello world")
  //   → dispatches a CustomEvent, isolated world handles it, logs result.
  try {
    const bridge = document.createElement('script');
    bridge.textContent = `
      window.__SignBridgeLoaded = true;
      window.SignBridgeDebug = {
        textToSigns: function(text) {
          window.dispatchEvent(new CustomEvent('__sb_debug_tts', { detail: { text } }));
          console.info('[SignBridge] textToSigns("' + text + '") — see __sb_debug_result event');
        }
      };
    `;
    (document.head || document.documentElement).appendChild(bridge);
    bridge.remove();

    // Listen in isolated world and respond with the result
    window.addEventListener('__sb_debug_tts', (e) => {
      const result = SB.SignMapper.textToSigns(e.detail.text);
      console.log('[SignBridge] textToSigns result:', result.map(s => s._word || s.gloss || s._key));
    });
  } catch (_) {}

})();
