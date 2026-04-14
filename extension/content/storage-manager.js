/**
 * SignBridge — Storage Manager
 *
 * Thin wrapper around chrome.storage.sync that:
 *  - Provides sensible defaults for all settings
 *  - Offers a promise-based API instead of callback-based
 *  - Merges retrieved values with defaults so callers always get a complete object
 *  - Notifies registered listeners when any value changes
 *
 * Privacy note: No audio, captions, or personal data are ever stored.
 * Only UI preferences and phrasebook entries live in storage.
 */

(function () {
  'use strict';

  window.SignBridge = window.SignBridge || {};

  window.SignBridge.StorageManager = {

    /** All configurable values with their defaults. */
    DEFAULTS: {
      // Avatar display
      avatarEnabled:     true,
      avatarSize:        280,         // px, width of avatar overlay
      avatarOpacity:     0.95,
      avatarPosition:    { x: 20, y: 120 },  // px from top-left of viewport

      // Caption / audio source
      captionSource:     'auto',  // 'auto' | 'platform' | 'speech' | 'both'

      // Animation
      animationSpeed:    1.0,     // 0.5 = slow, 1.0 = normal, 2.0 = fast
      showCaptions:      true,    // display transcribed text below avatar
      showHints:         true,    // show brief sign description tooltip

      // Appearance
      backgroundColor:   '#0f172a',  // dark navy, matches LinguaBridge brand
      avatarTheme:       'default',   // 'default' | 'outline' | 'minimal'
      handedness:        'right',     // dominant signing hand

      // Educational features
      phrasebookEnabled:    true,
      educationalPanelOpen: false,
      savedPhrases:         [],       // user-saved signs for the phrasebook

      // Accessibility
      highContrast:      false,
      reducedMotion:     false,   // respects prefers-reduced-motion when true
    },

    /**
     * Retrieve one or more settings by key.
     * @param {string|string[]|null} keys - key(s) to retrieve; null = all
     * @returns {Promise<Object>} resolved settings merged with defaults
     */
    async get(keys = null) {
      const requestKeys = keys === null
        ? Object.keys(this.DEFAULTS)
        : Array.isArray(keys) ? keys : [keys];

      return new Promise((resolve) => {
        chrome.storage.sync.get(requestKeys, (result) => {
          // Always fill in missing keys from DEFAULTS so callers never get undefined
          const merged = {};
          for (const key of requestKeys) {
            merged[key] = result[key] !== undefined
              ? result[key]
              : this.DEFAULTS[key];
          }
          resolve(merged);
        });
      });
    },

    /**
     * Persist one or more settings.
     * @param {Object} data - key-value pairs to store
     */
    async set(data) {
      return new Promise((resolve) => {
        chrome.storage.sync.set(data, resolve);
      });
    },

    /** Retrieve all settings. Convenience alias for get(null). */
    async getAll() {
      return this.get(null);
    },

    /**
     * Register a listener for storage changes.
     * @param {Function} callback - called with { key: newValue, ... } on any change
     */
    onChange(callback) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return;
        const delta = {};
        for (const [key, { newValue }] of Object.entries(changes)) {
          delta[key] = newValue;
        }
        callback(delta);
      });
    },

    /**
     * Add a phrase to the user's personal phrasebook.
     * Deduplicates by word key.
     */
    async addToPhrasebook(signKey, signGloss, note = '') {
      const { savedPhrases } = await this.get('savedPhrases');
      const entry = { key: signKey, gloss: signGloss, note, savedAt: Date.now() };
      const updated = [entry, ...savedPhrases.filter(p => p.key !== signKey)];
      // Keep at most 200 saved phrases
      await this.set({ savedPhrases: updated.slice(0, 200) });
    },

    async removeFromPhrasebook(signKey) {
      const { savedPhrases } = await this.get('savedPhrases');
      await this.set({ savedPhrases: savedPhrases.filter(p => p.key !== signKey) });
    },
  };

})();
