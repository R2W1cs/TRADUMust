/**
 * SignBridge — Platform Detector
 *
 * Identifies which video platform the user is on and provides platform-specific
 * selectors for scraping live captions from the DOM.
 *
 * Architecture note:
 *   Caption scraping is our PREFERRED caption source because:
 *   - It is zero-latency (captions are already on screen)
 *   - It uses the platform's own ASR, which is typically higher quality
 *   - It avoids any audio capture privacy surface
 *   - It works even when the user's microphone is muted
 *
 *   Web Speech API (microphone) is the FALLBACK for platforms where we cannot
 *   reliably scrape captions (Zoom, unknown platforms).
 */

(function () {
  'use strict';

  window.SignBridge = window.SignBridge || {};

  window.SignBridge.PlatformDetector = {

    PLATFORMS: {
      YOUTUBE:  'youtube',
      MEET:     'google-meet',
      ZOOM:     'zoom',
      TEAMS:    'microsoft-teams',
      UNKNOWN:  'unknown',
    },

    detect() {
      const h = location.hostname;
      if (h.includes('youtube.com'))         return this.PLATFORMS.YOUTUBE;
      if (h.includes('meet.google.com'))     return this.PLATFORMS.MEET;
      if (h.includes('zoom.us'))             return this.PLATFORMS.ZOOM;
      if (h.includes('teams.microsoft.com')) return this.PLATFORMS.TEAMS;
      if (h.includes('teams.live.com'))      return this.PLATFORMS.TEAMS;
      return this.PLATFORMS.UNKNOWN;
    },

    getDisplayName() {
      return {
        'youtube':           'YouTube',
        'google-meet':       'Google Meet',
        'zoom':              'Zoom',
        'microsoft-teams':   'Microsoft Teams',
        'unknown':           'Unknown Platform',
      }[this.detect()] || 'Unknown';
    },

    isVideoCall() {
      const p = this.detect();
      return p === this.PLATFORMS.MEET ||
             p === this.PLATFORMS.ZOOM ||
             p === this.PLATFORMS.TEAMS;
    },

    /**
     * Returns ordered list of CSS selectors to observe for caption text.
     * Each selector is tried in order; the first one that yields text wins.
     *
     * Selectors are kept intentionally broad so they survive minor UI updates.
     * They are validated live by the AudioProcessor before committing.
     */
    getCaptionSelectors() {
      const selectors = {
        'youtube': [
          // YouTube closed captions (CC button active)
          '.ytp-caption-segment',
          // YouTube auto-generated subtitles
          '.captions-text span',
          '.caption-window .captions-text',
          // YouTube Live stream captions
          '[class*="caption-visual-line"] span',
        ],
        'google-meet': [
          // Meet live captions (enable in More Options → Captions)
          // These selectors cover Meet UI as of late 2024
          '[jsname="tgaKEf"]',
          '.a4cQT',
          '.CNusmb',
          // Fallback broader selectors
          '[data-message-text]',
          '[class*="caption"] span',
        ],
        'zoom': [
          // Zoom web client live transcript
          '.captions-text',
          '.subtitle-text',
          '[class*="caption-item"]',
          '[aria-label*="caption"]',
        ],
        'microsoft-teams': [
          // Teams live captions panel
          '[data-tid="closed-captions-text"]',
          '.ts-caption-box',
          '[class*="caption-text"]',
          // Teams meeting transcript
          '[data-tid="message-body-content"]',
        ],
        'unknown': [],
      };
      return selectors[this.detect()] || [];
    },

    /**
     * Returns CSS selectors for the primary video element on this platform.
     * Used to position the avatar overlay relative to the video.
     */
    getVideoSelectors() {
      return {
        'youtube':         ['#movie_player video', '.html5-main-video'],
        'google-meet':     ['[data-resolution-cap] video', 'video[jsname]'],
        'zoom':            ['video.video-stream', '#zoom-sdk video'],
        'microsoft-teams': ['video[class*="video"]', '.video-stream video'],
        'unknown':         ['video'],
      }[this.detect()] || ['video'];
    },

    /**
     * Whether this platform reliably provides DOM-accessible captions.
     * If false, AudioProcessor will fall through to Web Speech API.
     */
    hasDomCaptions() {
      return this.detect() !== this.PLATFORMS.UNKNOWN &&
             this.detect() !== this.PLATFORMS.ZOOM; // Zoom uses iframe/shadow DOM
    },

    /**
     * Instructions shown in the popup to help users enable captions
     * on each platform (since they need to be active for DOM scraping to work).
     */
    getCaptionSetupInstructions() {
      return {
        'youtube': 'Click the CC button in the YouTube player controls.',
        'google-meet': 'Click the three-dot menu → "Turn on captions".',
        'zoom': 'Click "CC" in the meeting controls toolbar.',
        'microsoft-teams': 'Click "More" (···) → "Language and speech" → "Turn on live captions".',
        'unknown': 'Enable captions on your platform if available, or allow microphone access.',
      }[this.detect()] || '';
    },
  };

})();
