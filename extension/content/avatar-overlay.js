/**
 * SignBridge — Avatar Overlay
 *
 * Creates and manages the draggable, resizable floating overlay that hosts
 * the signing avatar on any supported video platform.
 *
 * Features:
 *  - Draggable via mouse + touch
 *  - Resizable via corner handle (min 150px, max 480px)
 *  - Sign queue with smooth transitions between signs
 *  - Caption display below avatar (optional)
 *  - Educational hint tooltip on hover
 *  - Keyboard shortcut: Alt+Shift+S to toggle
 *  - Persists position + size across page navigations via storage
 *  - Falls back gracefully if the page already has a SignBridge overlay
 */

(function () {
  'use strict';

  window.SignBridge = window.SignBridge || {};

  const OVERLAY_ID   = 'signbridge-avatar-overlay';
  const Z_INDEX      = 2147483640; // near max, above most page content

  window.SignBridge.AvatarOverlay = {

    _el:          null,   // root overlay element
    _avatarEl:    null,   // SVG container
    _captionEl:   null,   // caption text element
    _hintEl:      null,   // educational hint element
    _resizeHandle:null,
    _signQueue:   [],     // pending signs
    _currentSign: null,   // actively displayed sign
    _animTimer:   null,
    _flashTimer:  null,   // flash transition timer
    _settings:    {},
    _isDragging:  false,
    _isResizing:  false,
    _dragStart:   { x: 0, y: 0, elX: 0, elY: 0 },
    _resizeStart: { size: 280, mouseX: 0, mouseY: 0 },
    _visible:     true,
    _paused:      false,  // video is paused — hold queue

    // ── Lifecycle ────────────────────────────────────────────────────────────

    async init() {
      // Don't inject twice
      if (document.getElementById(OVERLAY_ID)) return;

      this._settings = await window.SignBridge.StorageManager.getAll();
      if (!this._settings.avatarEnabled) return;

      this._buildDOM();
      this._attachDragHandlers();
      this._attachResizeHandlers();
      this._attachKeyboardHandlers();
      this._restorePosition();

      // Listen for settings changes
      window.SignBridge.StorageManager.onChange((changes) => {
        if ('avatarEnabled' in changes) {
          changes.avatarEnabled ? this.show() : this.hide();
        }
        if ('showCaptions' in changes) {
          this._captionEl.style.display = changes.showCaptions ? 'block' : 'none';
        }
        if ('showHints' in changes) {
          this._settings.showHints = changes.showHints;
        }
        if ('avatarOpacity' in changes) {
          this._el.style.opacity = changes.avatarOpacity;
        }
      });

      // Apply opacity transition to avatar wrap for flash effect
      if (this._avatarEl) {
        this._avatarEl.style.transition = 'opacity 0.08s ease';
      }

      // Show resting avatar immediately
      this._renderCurrentSign(null);
    },

    destroy() {
      if (this._el) {
        this._el.remove();
        this._el = null;
      }
      clearTimeout(this._animTimer);
      this._signQueue = [];
    },

    show() {
      if (this._el) this._el.style.display = 'flex';
      this._visible = true;
    },

    hide() {
      if (this._el) this._el.style.display = 'none';
      this._visible = false;
    },

    toggle() {
      this._visible ? this.hide() : this.show();
    },

    /** Called when the video element fires a 'pause' event. */
    pauseSigning() {
      if (this._paused) return;
      this._paused = true;
      // Stop the queue timer and drain nothing — keep queued signs for resume
      clearTimeout(this._animTimer);
      this._animTimer = null;
      // Return avatar to rest pose immediately
      this._renderCurrentSign(null);
      if (this._captionEl) this._captionEl.textContent = '';
    },

    /** Called when the video element fires a 'play' event. */
    resumeSigning() {
      if (!this._paused) return;
      this._paused = false;
      // Clear any stale captions accumulated while paused
      this._signQueue = [];
      this._renderCurrentSign(null);
    },

    // ── DOM construction ─────────────────────────────────────────────────────

    _buildDOM() {
      const { avatarSize, avatarOpacity, avatarPosition, backgroundColor, showCaptions, showHints } = this._settings;

      const overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      overlay.className = 'sb-overlay';
      overlay.style.cssText = `
        position: fixed;
        left: ${avatarPosition.x}px;
        top:  ${avatarPosition.y}px;
        width: ${avatarSize}px;
        z-index: ${Z_INDEX};
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        opacity: ${avatarOpacity};
        user-select: none;
        touch-action: none;
        filter: drop-shadow(0 4px 24px rgba(0,0,0,0.5));
      `;

      // ── Header / drag bar ────────────────────────────────────────────────
      const header = document.createElement('div');
      header.className = 'sb-header';
      header.title = 'Drag to reposition — SignBridge';
      header.style.cssText = `
        width: 100%;
        height: 20px;
        background: ${backgroundColor};
        border-radius: 12px 12px 0 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 8px;
        box-sizing: border-box;
        cursor: grab;
        border-bottom: 1px solid rgba(255,255,255,0.07);
      `;

      const logo = document.createElement('span');
      logo.textContent = '🤟 SignBridge';
      logo.style.cssText = 'font-size: 9px; color: rgba(255,255,255,0.5); font-family: sans-serif; letter-spacing: 0.5px;';
      header.appendChild(logo);

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.title = 'Hide (Alt+Shift+S to restore)';
      closeBtn.style.cssText = `
        background: none; border: none; color: rgba(255,255,255,0.4);
        font-size: 14px; cursor: pointer; padding: 0 2px; line-height: 1;
      `;
      closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.hide(); });
      header.appendChild(closeBtn);

      // ── Avatar SVG container ─────────────────────────────────────────────
      const avatarWrap = document.createElement('div');
      avatarWrap.className = 'sb-avatar-wrap';
      avatarWrap.style.cssText = `
        width: 100%;
        background: ${backgroundColor};
        border-radius: 0;
        overflow: hidden;
        position: relative;
        opacity: 1;
        transition: opacity 0.08s ease;
      `;
      this._avatarEl = avatarWrap;

      // ── Hint tooltip ─────────────────────────────────────────────────────
      const hint = document.createElement('div');
      hint.className = 'sb-hint';
      hint.style.cssText = `
        display: none;
        position: absolute;
        bottom: 8px;
        left: 8px;
        right: 8px;
        background: rgba(0,0,0,0.75);
        color: rgba(255,255,255,0.85);
        font-size: 9px;
        font-family: sans-serif;
        padding: 4px 6px;
        border-radius: 6px;
        text-align: center;
        pointer-events: none;
        line-height: 1.4;
      `;
      this._hintEl = hint;
      avatarWrap.appendChild(hint);

      // Show hint on hover
      avatarWrap.addEventListener('mouseenter', () => {
        if (showHints && this._currentSign?.description) {
          hint.textContent = this._currentSign.description;
          hint.style.display = 'block';
        }
      });
      avatarWrap.addEventListener('mouseleave', () => {
        hint.style.display = 'none';
      });

      // ── Caption bar ──────────────────────────────────────────────────────
      const caption = document.createElement('div');
      caption.className = 'sb-caption';
      caption.style.cssText = `
        display: ${showCaptions ? 'block' : 'none'};
        width: 100%;
        background: ${backgroundColor};
        color: rgba(255,255,255,0.85);
        font-size: 11px;
        font-family: sans-serif;
        padding: 5px 8px;
        box-sizing: border-box;
        text-align: center;
        min-height: 22px;
        line-height: 1.4;
        letter-spacing: 0.3px;
        border-top: 1px solid rgba(255,255,255,0.06);
      `;
      this._captionEl = caption;

      // ── Resize handle (bottom-right corner) ─────────────────────────────
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'sb-resize';
      resizeHandle.title = 'Drag to resize';
      resizeHandle.style.cssText = `
        position: absolute;
        bottom: 0;
        right: 0;
        width: 16px;
        height: 16px;
        cursor: nwse-resize;
        background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.2) 50%);
        border-radius: 0 0 8px 0;
      `;
      this._resizeHandle = resizeHandle;

      // ── Footer bar ───────────────────────────────────────────────────────
      const footer = document.createElement('div');
      footer.style.cssText = `
        width: 100%;
        background: ${backgroundColor};
        border-radius: 0 0 12px 12px;
        position: relative;
        height: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-top: 1px solid rgba(255,255,255,0.04);
      `;
      footer.appendChild(resizeHandle);

      // ── Assemble ─────────────────────────────────────────────────────────
      overlay.appendChild(header);
      overlay.appendChild(avatarWrap);
      overlay.appendChild(caption);
      overlay.appendChild(footer);

      document.body.appendChild(overlay);
      this._el = overlay;
    },

    // ── Sign queue & animation ────────────────────────────────────────────────

    /**
     * Queue a list of sign configs for sequential display.
     * Each sign is shown for a duration based on its complexity and animation speed.
     */
    enqueueSign(signConfig) {
      if (this._paused) return;
      this._signQueue.push(signConfig);
      if (!this._animTimer) {
        this._advanceQueue();
      }
    },

    enqueueSignSequence(signs) {
      if (this._paused) return;
      this._signQueue.push(...signs);
      if (!this._animTimer) {
        this._advanceQueue();
      }
    },

    _advanceQueue() {
      // Don't animate while the video is paused
      if (this._paused) return;

      if (this._signQueue.length === 0) {
        // Show rest pose after 2 seconds of inactivity
        this._animTimer = setTimeout(() => {
          this._renderWithFlash(null);
          this._animTimer = null;
        }, 2000);
        return;
      }

      const sign = this._signQueue.shift();
      this._renderWithFlash(sign);

      const speed    = this._settings.animationSpeed || 1.0;
      const isFinger = sign._isFingerspell;
      const baseDur  = isFinger ? 350 : 900;
      const duration = Math.round(baseDur / speed);

      this._animTimer = setTimeout(() => {
        this._animTimer = null;
        this._advanceQueue();
      }, duration);
    },

    /**
     * Flash the avatar out (0.08s) then swap the sign and fade back in.
     * For rest-pose transitions (sign=null) just cross-fade without hard flash.
     */
    _renderWithFlash(sign) {
      if (!this._avatarEl) {
        this._renderCurrentSign(sign);
        return;
      }

      clearTimeout(this._flashTimer);

      if (sign === null) {
        // Soft fade to rest — no harsh flash needed
        this._renderCurrentSign(null);
        return;
      }

      // Fade out
      this._avatarEl.style.opacity = '0';

      // After 0.1 s: swap content + fade back in
      this._flashTimer = setTimeout(() => {
        this._renderCurrentSign(sign);
        this._avatarEl.style.opacity = '1';
      }, 100);
    },

    _renderCurrentSign(sign) {
      this._currentSign = sign;
      if (!this._avatarEl) return;

      const renderer = window.SignBridge.AvatarRenderer;
      const size     = this._el ? parseInt(this._el.style.width) || 280 : 280;

      const svgStr = sign
        ? renderer.render(sign, { width: size, height: Math.round(size * 0.72), showLabels: false })
        : renderer.renderRest({ width: size, height: Math.round(size * 0.72) });

      // Preserve the hint element when replacing SVG
      this._avatarEl.innerHTML = svgStr;
      this._avatarEl.appendChild(this._hintEl);

      // Update caption
      if (sign && this._captionEl) {
        const word = sign._word || sign.gloss || '';
        if (word) {
          this._captionEl.textContent = word.toUpperCase();
          this._captionEl.style.color = sign._isFingerspell ? '#93C5FD' : 'rgba(255,255,255,0.85)';
        }
      }
    },

    updateCaption(text) {
      if (this._captionEl && this._settings.showCaptions) {
        this._captionEl.textContent = text;
        this._captionEl.style.color = 'rgba(255,255,255,0.65)';
      }
    },

    clearQueue() {
      this._signQueue = [];
      clearTimeout(this._animTimer);
      clearTimeout(this._flashTimer);
      this._animTimer = null;
      this._flashTimer = null;
    },

    // ── Drag ─────────────────────────────────────────────────────────────────

    _attachDragHandlers() {
      const header = this._el.querySelector('.sb-header');
      if (!header) return;

      const onStart = (e) => {
        if (e.target.tagName === 'BUTTON') return;
        this._isDragging = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        this._dragStart = {
          x:   clientX,
          y:   clientY,
          elX: parseInt(this._el.style.left) || 20,
          elY: parseInt(this._el.style.top)  || 120,
        };
        header.style.cursor = 'grabbing';
        e.preventDefault();
      };

      const onMove = (e) => {
        if (!this._isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = clientX - this._dragStart.x;
        const dy = clientY - this._dragStart.y;
        const newX = Math.max(0, Math.min(window.innerWidth  - 100, this._dragStart.elX + dx));
        const newY = Math.max(0, Math.min(window.innerHeight - 50,  this._dragStart.elY + dy));
        this._el.style.left = `${newX}px`;
        this._el.style.top  = `${newY}px`;
      };

      const onEnd = () => {
        if (!this._isDragging) return;
        this._isDragging = false;
        header.style.cursor = 'grab';
        // Persist position
        const pos = { x: parseInt(this._el.style.left), y: parseInt(this._el.style.top) };
        window.SignBridge.StorageManager.set({ avatarPosition: pos });
      };

      header.addEventListener('mousedown', onStart);
      header.addEventListener('touchstart', onStart, { passive: false });
      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove',  onMove, { passive: false });
      document.addEventListener('mouseup',  onEnd);
      document.addEventListener('touchend', onEnd);
    },

    // ── Resize ────────────────────────────────────────────────────────────────

    _attachResizeHandlers() {
      const handle = this._resizeHandle;
      if (!handle) return;

      const onStart = (e) => {
        this._isResizing = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        this._resizeStart = {
          size:   parseInt(this._el.style.width) || 280,
          mouseX: clientX,
          mouseY: clientY,
        };
        e.preventDefault();
        e.stopPropagation();
      };

      const onMove = (e) => {
        if (!this._isResizing) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const dx = clientX - this._resizeStart.mouseX;
        const newSize = Math.max(150, Math.min(480, this._resizeStart.size + dx));
        this._el.style.width = `${newSize}px`;
        // Re-render at new size
        this._renderCurrentSign(this._currentSign);
      };

      const onEnd = () => {
        if (!this._isResizing) return;
        this._isResizing = false;
        const size = parseInt(this._el.style.width);
        window.SignBridge.StorageManager.set({ avatarSize: size });
      };

      handle.addEventListener('mousedown', onStart);
      handle.addEventListener('touchstart', onStart, { passive: false });
      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove',  onMove, { passive: false });
      document.addEventListener('mouseup',  onEnd);
      document.addEventListener('touchend', onEnd);
    },

    // ── Keyboard ──────────────────────────────────────────────────────────────

    _attachKeyboardHandlers() {
      document.addEventListener('keydown', (e) => {
        if (e.altKey && e.shiftKey && e.key === 'S') {
          e.preventDefault();
          this.toggle();
        }
      });
    },

    // ── Position restore ──────────────────────────────────────────────────────

    _restorePosition() {
      const { avatarPosition, avatarSize } = this._settings;
      if (!this._el) return;
      if (avatarPosition) {
        this._el.style.left = `${avatarPosition.x}px`;
        this._el.style.top  = `${avatarPosition.y}px`;
      }
      if (avatarSize) {
        this._el.style.width = `${avatarSize}px`;
      }
    },
  };

})();
