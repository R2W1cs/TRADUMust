/**
 * SignBridge — Audio Processor
 *
 * Provides transcribed text to the content script via two strategies:
 *
 *  Strategy A — Platform caption DOM scraping (preferred):
 *    Watches the page DOM for caption elements using MutationObserver.
 *    Works on YouTube (with CC enabled), Google Meet (with captions on),
 *    and Microsoft Teams (with live captions on).
 *    This is zero-latency, highest accuracy, and privacy-preserving.
 *
 *  Strategy B — Web Speech API (fallback):
 *    Uses the browser's built-in SpeechRecognition (Chromium's Whisper-based
 *    ASR) with microphone access. Works on Zoom and unknown platforms.
 *    Requires microphone permission — user is prompted once.
 *
 * The processor debounces and deduplicates text to avoid flooding the
 * sign mapper with repeated or partial captions.
 */

(function () {
  'use strict';

  window.SignBridge = window.SignBridge || {};

  window.SignBridge.AudioProcessor = {

    _observer: null,       // MutationObserver for DOM captions
    _recognition: null,    // SpeechRecognition instance
    _onText: null,         // callback(text, isFinal)
    _lastText: '',         // dedup: last caption text sent
    _debounceTimer: null,
    _active: false,
    _strategy: 'none',     // 'dom' | 'speech' | 'none'

    /**
     * Start capturing captions.
     * @param {Function} onText - callback(text: string, isFinal: boolean)
     * @param {string} captionSource - 'auto' | 'platform' | 'speech'
     */
    start(onText, captionSource = 'auto') {
      if (this._active) return;
      this._onText  = onText;
      this._active  = true;
      this._lastText = '';

      const platform   = window.SignBridge.PlatformDetector;
      const useDom     = captionSource === 'auto' || captionSource === 'platform';
      const useSpeech  = captionSource === 'speech' || (captionSource === 'auto' && !platform.hasDomCaptions());

      if (useDom && platform.hasDomCaptions()) {
        this._startDomObserver();
      }
      if (useSpeech || (captionSource === 'auto' && this._strategy === 'none')) {
        // If DOM observer doesn't find captions within 3 seconds, fall back to speech
        if (useDom && platform.hasDomCaptions()) {
          setTimeout(() => {
            if (this._strategy === 'none') {
              console.log('[SignBridge] No DOM captions found — falling back to Web Speech API');
              this._startSpeechRecognition();
            }
          }, 3000);
        } else {
          this._startSpeechRecognition();
        }
      }
    },

    stop() {
      this._active = false;
      if (this._observer) {
        this._observer.disconnect();
        this._observer = null;
      }
      if (this._recognition) {
        this._recognition.stop();
        this._recognition = null;
      }
      this._strategy = 'none';
    },

    // ── Strategy A: DOM observation ──────────────────────────────────────────

    _startDomObserver() {
      const selectors = window.SignBridge.PlatformDetector.getCaptionSelectors();
      if (selectors.length === 0) return;

      // Watch the entire document body for any caption container appearing
      this._observer = new MutationObserver(() => {
        this._pollCaptionElements(selectors);
      });

      this._observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        characterDataOldValue: false,
      });

      // Also poll immediately in case captions already exist
      this._pollCaptionElements(selectors);
    },

    _pollCaptionElements(selectors) {
      let captionText = '';

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) continue;

        // Collect all caption text from matched elements
        const text = Array.from(elements)
          .map(el => el.textContent || el.innerText || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (text.length > 2) {
          captionText = text;
          if (this._strategy === 'none') {
            // First caption found — lock strategy to DOM
            this._strategy = 'dom';
            console.log(`[SignBridge] DOM captions found via "${selector}"`);
          }
          break;
        }
      }

      if (captionText && captionText !== this._lastText) {
        this._emitText(captionText, true);
      }
    },

    // ── Strategy B: Web Speech API ───────────────────────────────────────────

    _startSpeechRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('[SignBridge] Web Speech API not available — no captions possible.');
        return;
      }

      this._strategy = 'speech';
      const rec = new SpeechRecognition();
      rec.continuous    = true;
      rec.interimResults = true;
      rec.lang          = navigator.language || 'en-US';
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        console.log('[SignBridge] Web Speech API started (microphone)');
      };

      rec.onresult = (event) => {
        let interimText = '';
        let finalText   = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          if (result.isFinal) {
            finalText += transcript + ' ';
          } else {
            interimText += transcript;
          }
        }

        if (finalText.trim()) {
          this._emitText(finalText.trim(), true);
        } else if (interimText.trim()) {
          this._emitText(interimText.trim(), false);
        }
      };

      rec.onerror = (event) => {
        // 'no-speech' is expected when the user is quiet — don't warn
        if (event.error !== 'no-speech') {
          console.warn('[SignBridge] SpeechRecognition error:', event.error);
        }
        // Restart automatically after network/audio errors (not permission errors)
        if (event.error !== 'not-allowed' && event.error !== 'service-not-allowed') {
          setTimeout(() => {
            if (this._active && this._strategy === 'speech') {
              rec.start();
            }
          }, 1000);
        }
      };

      rec.onend = () => {
        // Continuously restart if still active
        if (this._active && this._strategy === 'speech') {
          setTimeout(() => {
            try { rec.start(); } catch { /* already started */ }
          }, 200);
        }
      };

      try {
        rec.start();
        this._recognition = rec;
      } catch (err) {
        console.warn('[SignBridge] Could not start SpeechRecognition:', err.message);
      }
    },

    // ── Debounced emitter ────────────────────────────────────────────────────

    _emitText(text, isFinal) {
      // Skip near-duplicates (platform captions can fire many times per frame)
      if (text === this._lastText) return;
      if (isFinal && this._lastText.includes(text)) return;

      // For interim (non-final) results, debounce to avoid sign-queue flooding
      if (!isFinal) {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
          if (this._active && this._onText) {
            this._onText(text, false);
          }
        }, 150);
        return;
      }

      this._lastText = text;
      if (this._onText) {
        this._onText(text, true);
      }
    },

    /** Return which strategy is currently in use. */
    getStrategy() {
      return this._strategy;
    },

    isActive() {
      return this._active;
    },
  };

})();
