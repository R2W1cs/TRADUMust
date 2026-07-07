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
    _avatarEl:    null,   // avatar container (holds iframe or SVG fallback)
    _iframeCwasaEl: null,  // CWASA 3D avatar (3dasl-avatar.vercel.app)
    _iframeHandsEl: null,  // legacy — unused
    _iframeModelEl: null,  // legacy — unused
    _svgContainerEl: null, // 2D vector SVG container
    _d2FrameEl:   null,   // Direction-2 recognizer iframe
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
    _signQueue:   [],
    _wordBubble:  null,
    _avgDuration: 1000,
    _currentSign: null,
    _d2Enabled:   false,
    _cwasaReady:  false,

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
          if (changes.avatarEnabled) {
            if (!this._el) {
              this.init();
            } else {
              this.show();
            }
          } else {
            this.hide();
          }
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
        if ('avatarMode' in changes) {
          this.setAvatarMode(changes.avatarMode);
        }
      });

      // Listen for Direction-2 sign recognition results + CWASA ready / errors
      window.addEventListener('message', (e) => {
        if (e.data?.type === 'TRADUMUST_READY') {
          this._cwasaReady = true;
        }
        if (e.data?.type === 'TRADUMUST_ERROR' && this._settings.avatarMode === '3d-cwasa') {
          console.warn('[SignBridge] CWASA error, falling back to 2D:', e.data.message);
          this.setAvatarMode('2d');
        }
        if (e.data?.type === 'SB_SIGN' && this._d2Enabled) {
          const { label, key } = e.data;
          this.updateCaption(`Signing: ${label || key}`);
        }
        if (e.data?.type === 'SB_SIGN_CLEARED' && this._d2Enabled) {
          if (this._captionEl) this._captionEl.textContent = '';
        }
      });

      // Set initial mode and show resting avatar immediately
      this.setAvatarMode(this._settings.avatarMode || '2d');
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

    setAvatarMode(mode) {
      // Migrate legacy 3D modes to CWASA avatar
      if (mode === '3d' || mode === '3d-hands' || mode === '3d-model') mode = '3d-cwasa';
      this._settings.avatarMode = mode;

      const is2d = mode === '2d';
      const isCwasa = mode === '3d-cwasa';

      if (this._svgContainerEl) {
        this._svgContainerEl.style.display = is2d ? 'flex' : 'none';
      }
      if (this._iframeCwasaEl) {
        this._iframeCwasaEl.style.display = isCwasa ? 'block' : 'none';
      }
      if (this._iframeHandsEl) this._iframeHandsEl.style.display = 'none';
      if (this._iframeModelEl) this._iframeModelEl.style.display = 'none';

      this._renderCurrentSign(this._currentSign);
    },

    _getActive3dIframe() {
      const mode = this._settings.avatarMode;
      if (mode === '3d' || mode === '3d-hands' || mode === '3d-model' || mode === '3d-cwasa') {
        return this._iframeCwasaEl;
      }
      return null;
    },

    _postTo3dIframes(message) {
      if (this._iframeCwasaEl?.contentWindow) {
        this._iframeCwasaEl.contentWindow.postMessage(message, '*');
      }
    },

    _signToGlossText(sign) {
      if (!sign) return '';
      const raw = sign._word || sign.gloss || sign._key || '';
      return String(raw).replace(/_/g, ' ').trim();
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

      // ── Zoom controls (in header, right side) ────────────────────────────
      const zoomGroup = document.createElement('div');
      zoomGroup.style.cssText = 'display:flex; align-items:center; gap:3px; margin-left:auto;';

      const _zoomBtnStyle = `
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 4px;
        color: rgba(255,255,255,0.65);
        font-size: 12px; font-family: sans-serif;
        width: 18px; height: 14px;
        line-height: 1; cursor: pointer;
        padding: 0; display:flex; align-items:center; justify-content:center;
      `;

      const zoomInBtn  = document.createElement('button');
      const zoomOutBtn = document.createElement('button');
      const zoomLabel  = document.createElement('span');

      zoomInBtn.textContent  = '+';
      zoomOutBtn.textContent = '−';
      zoomInBtn.title  = 'Zoom in';
      zoomOutBtn.title = 'Zoom out';
      zoomInBtn.style.cssText  = _zoomBtnStyle;
      zoomOutBtn.style.cssText = _zoomBtnStyle;
      zoomLabel.style.cssText  = 'font-size:8px; color:rgba(255,255,255,0.28); font-family:sans-serif; min-width:24px; text-align:center;';
      zoomLabel.textContent    = '100%';
      this._zoomLabel = zoomLabel;

      let _zoomLabelTimer = null;
      const _updateZoomLabel = (pct) => {
        zoomLabel.textContent = pct + '%';
        clearTimeout(_zoomLabelTimer);
        _zoomLabelTimer = setTimeout(() => { zoomLabel.textContent = ''; }, 1800);
      };

      const _sendZoom = (type) => {
        const frame = this._getActive3dIframe();
        if (frame?.contentWindow) {
          frame.contentWindow.postMessage({ type }, '*');
        }
      };

      zoomInBtn.addEventListener('click',  (e) => { e.stopPropagation(); _sendZoom('SB_ZOOM_IN');  });
      zoomOutBtn.addEventListener('click', (e) => { e.stopPropagation(); _sendZoom('SB_ZOOM_OUT'); });

      // Zoom level badge from iframe response
      window.addEventListener('message', (e) => {
        if (e.data?.type === 'SB_ZOOM_LEVEL') _updateZoomLabel(e.data.pct);
      });

      // Scroll wheel on the whole overlay → zoom
      overlay.addEventListener('wheel', (e) => {
        e.preventDefault();
        _sendZoom(e.deltaY < 0 ? 'SB_ZOOM_IN' : 'SB_ZOOM_OUT');
      }, { passive: false });

      zoomGroup.appendChild(zoomOutBtn);
      zoomGroup.appendChild(zoomLabel);
      zoomGroup.appendChild(zoomInBtn);
      header.appendChild(zoomGroup);

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.title = 'Hide (Alt+Shift+S to restore)';
      closeBtn.style.cssText = `
        background: none; border: none; color: rgba(255,255,255,0.4);
        font-size: 14px; cursor: pointer; padding: 0 2px; line-height: 1; margin-left:4px;
      `;
      closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.hide(); });
      header.appendChild(closeBtn);

      // ── 3D Avatar iframe ─────────────────────────────────────────────────
      const avatarWrap = document.createElement('div');
      avatarWrap.className = 'sb-avatar-wrap';
      avatarWrap.style.cssText = `
        width: 100%;
        background: ${backgroundColor};
        border-radius: 0;
        overflow: hidden;
        position: relative;
        opacity: 1;
        transition: opacity 0.12s ease;
      `;
      this._avatarEl = avatarWrap;

      // 2D SVG Container
      const svgContainer = document.createElement('div');
      svgContainer.className = 'sb-avatar-2d';
      svgContainer.style.cssText = `
        width: 100%;
        height: ${Math.round(avatarSize * 0.85)}px;
        display: none;
        align-items: center;
        justify-content: center;
        background: transparent;
      `;
      avatarWrap.appendChild(svgContainer);
      this._svgContainerEl = svgContainer;

      // CWASA 3D avatar iframe (https://3dasl-avatar.vercel.app)
      const iframeHeight = Math.round(avatarSize * 0.85);
      try {
        const cwasaFrame = document.createElement('iframe');
        cwasaFrame.src = chrome.runtime.getURL('3d/cwasa-embed.html');
        cwasaFrame.style.cssText = `
          width: 100%;
          height: ${iframeHeight}px;
          border: none;
          background: transparent;
          display: none;
        `;
        cwasaFrame.setAttribute('allow', 'autoplay');
        cwasaFrame.removeAttribute('sandbox');
        cwasaFrame.setAttribute('scrolling', 'no');
        cwasaFrame.setAttribute('title', '3D CWASA signing avatar');
        this._iframeCwasaEl = cwasaFrame;
        avatarWrap.appendChild(cwasaFrame);
      } catch (e) {
        console.warn('[SignBridge] Could not create CWASA iframe:', e);
      }

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
      this._updateAdaptiveSpeed();
      if (!this._animTimer) {
        this._advanceQueue();
      }
    },

    enqueueSignSequence(signs) {
      if (this._paused) return;
      this._signQueue.push(...signs);
      this._updateAdaptiveSpeed();
      if (!this._animTimer) {
        this._advanceQueue();
      }
    },

    _updateAdaptiveSpeed() {
      // If queue is long, speed up signs to catch up to real-time speech
      const len = this._signQueue.length;
      if (len > 8)       this._avgDuration = 450;
      else if (len > 5)  this._avgDuration = 650;
      else if (len > 2)  this._avgDuration = 850;
      else               this._avgDuration = 1000;
    },

    _advanceQueue() {
      // Don't animate while the video is paused
      if (this._paused) return;

      if (this._signQueue.length === 0) {
        this._hideWordBubble();
        // Show rest pose after 2 seconds of inactivity
        this._animTimer = setTimeout(() => {
          this._renderWithFlash(null);
          this._animTimer = null;
        }, 2000);
        return;
      }

      const sign = this._signQueue.shift();
      this._currentSign = sign;
      this._renderWithFlash(sign);
      this._showWordBubble(sign._word || sign.gloss);

      const speed    = this._settings.animationSpeed || 1.0;
      const adaptive = this._avgDuration / 1000; // Multiplier based on queue length
      const isFinger = sign._isFingerspell;
      const baseDur  = isFinger ? 350 : 900;
      
      // Combine user setting with real-time adaptive catch-up
      const duration = Math.round((baseDur * adaptive) / speed);

      this._animTimer = setTimeout(() => {
        this._animTimer = null;
        this._advanceQueue();
      }, duration);
    },

    _showWordBubble(text) {
      if (!text) return;
      if (!this._wordBubble) {
        this._wordBubble = document.createElement('div');
        this._wordBubble.className = 'sb-word-bubble';
        this._el.appendChild(this._wordBubble);
      }
      this._wordBubble.textContent = text.toLowerCase();
      this._wordBubble.style.display = 'block';
    },

    _hideWordBubble() {
      if (this._wordBubble) this._wordBubble.style.display = 'none';
    },

    /**
     * Cross-fade transition when swapping signs.
     * With 3D iframe: just send pose message (iframe handles its own lerp).
     */
    _renderWithFlash(sign) {
      this._renderCurrentSign(sign);
    },

    _renderCurrentSign(sign) {
      this._currentSign = sign;

      if (this._settings.avatarMode === '2d') {
        if (this._svgContainerEl && window.SignBridge.AvatarRenderer) {
          const size = this._settings.avatarSize || 280;
          const opts = { width: size, height: Math.round(size * 0.85), showLabels: false };
          if (sign) {
            this._svgContainerEl.innerHTML = window.SignBridge.AvatarRenderer.render(sign, opts);
          } else {
            this._svgContainerEl.innerHTML = window.SignBridge.AvatarRenderer.renderRest(opts);
          }
        }
      } else {
        const frame = this._getActive3dIframe();
        if (frame?.contentWindow) {
          if (sign) {
            const text = this._signToGlossText(sign);
            frame.contentWindow.postMessage({ type: 'TRADUMUST_PLAY', text }, '*');
          } else {
            frame.contentWindow.postMessage({ type: 'TRADUMUST_RESET' }, '*');
          }
        }
      }

      // ── Update caption bar ──────────────────────────────────────────────────
      if (sign && this._captionEl) {
        const word = sign._word || sign.gloss || '';
        if (word) {
          this._captionEl.textContent = word.replace(/_/g, ' ').toUpperCase();
          this._captionEl.style.color = sign._isFingerspell ? '#93C5FD' : 'rgba(255,255,255,0.85)';
        }
      } else if (!sign && this._captionEl) {
        this._captionEl.textContent = '';
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
        // Update iframe heights proportionally
        const h = `${Math.round(newSize * 0.85)}px`;
        if (this._iframeCwasaEl) this._iframeCwasaEl.style.height = h;
        if (this._svgContainerEl) {
          this._svgContainerEl.style.height = `${Math.round(newSize * 0.85)}px`;
          if (this._settings.avatarMode === '2d') {
            this._renderCurrentSign(this._currentSign);
          }
        }
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

    // ── Direction 2: Sign-to-Text recognition iframe ──────────────────────────

    enableSignRecognition() {
      if (this._d2Enabled || !this._el) return;
      this._d2Enabled = true;

      try {
        const iframe = document.createElement('iframe');
        iframe.src = chrome.runtime.getURL('d2/recognizer.html');
        iframe.allow = 'camera';
        iframe.style.cssText = `
          width: 100%;
          height: 200px;
          border: none;
          border-radius: 0 0 12px 12px;
          display: block;
          background: #0a0a14;
        `;
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        this._d2FrameEl = iframe;

        // Insert after caption bar, before footer
        const footer = this._el.querySelector('div:last-child');
        this._el.insertBefore(iframe, footer);

        console.log('[SignBridge D2] Recognizer panel injected');
      } catch (e) {
        console.warn('[SignBridge] Could not inject D2 iframe:', e);
      }
    },

    disableSignRecognition() {
      if (!this._d2Enabled) return;
      this._d2Enabled = false;

      if (this._d2FrameEl) {
        this._d2FrameEl.contentWindow?.postMessage({ type: 'SB_D2_STOP' }, '*');
        this._d2FrameEl.remove();
        this._d2FrameEl = null;
      }
    },

    toggleSignRecognition() {
      this._d2Enabled ? this.disableSignRecognition() : this.enableSignRecognition();
    },
  };

})();
