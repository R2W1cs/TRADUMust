/**
 * TRADUMUST — Content Script
 *
 * Injected into meeting pages (Zoom, Google Meet, Teams).
 * Creates a floating iframe overlay and drives it with real-time
 * speech recognition via the Web Speech API.
 */

(function () {
  "use strict";

  if (window.__linguaBridgeLoaded) return;
  window.__linguaBridgeLoaded = true;

  // ── Config ──────────────────────────────────────────────────────────────────
  const OVERLAY_ID = "tradumust-overlay-frame";
  const ROOT_ID = "tradumust-root";
  let isActive = false;
  let recognition = null;
  let overlayFrame = null;
  let settings = {
    overlayPosition: "bottom-right",
    overlaySize: "medium",
    signLanguage: "ASL",
  };

  const SIZE_MAP = {
    small:  { width: "320px", height: "280px" },
    medium: { width: "420px", height: "360px" },
    large:  { width: "560px", height: "460px" },
  };

  const POSITION_MAP = {
    "bottom-right": { bottom: "20px", right: "20px", top: "auto", left: "auto" },
    "bottom-left":  { bottom: "20px", left: "20px",  top: "auto", right: "auto" },
    "top-right":    { top: "20px",    right: "20px",  bottom: "auto", left: "auto" },
    "top-left":     { top: "20px",    left: "20px",   bottom: "auto", right: "auto" },
  };

  // ── Load settings ────────────────────────────────────────────────────────────
  chrome.storage.local.get(
    { overlayPosition: "bottom-right", overlaySize: "medium", signLanguage: "ASL" },
    (stored) => { Object.assign(settings, stored); }
  );

  // ── Overlay management ───────────────────────────────────────────────────────
  function createOverlay() {
    // Remove existing if any
    removeOverlay();

    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.style.cssText = "all:initial;position:fixed;z-index:2147483647;pointer-events:none;";

    const pos = POSITION_MAP[settings.overlayPosition] ?? POSITION_MAP["bottom-right"];
    const size = SIZE_MAP[settings.overlaySize] ?? SIZE_MAP.medium;

    const frame = document.createElement("iframe");
    frame.id = OVERLAY_ID;
    frame.src = chrome.runtime.getURL("overlay.html");
    frame.allow = "microphone";
    frame.style.cssText = [
      `width:${size.width}`,
      `height:${size.height}`,
      `border:none`,
      `border-radius:16px`,
      `box-shadow:0 20px 60px rgba(0,0,0,0.5)`,
      `pointer-events:all`,
      `position:fixed`,
      `z-index:2147483647`,
      `transition:all 0.3s ease`,
      ...Object.entries(pos).map(([k, v]) => `${k}:${v}`),
    ].join(";");

    root.appendChild(frame);
    document.body.appendChild(root);
    overlayFrame = frame;

    // Send settings once frame loads
    frame.addEventListener("load", () => {
      postToOverlay({ type: "INIT", settings });
    });

    return frame;
  }

  function removeOverlay() {
    document.getElementById(ROOT_ID)?.remove();
    overlayFrame = null;
  }

  function postToOverlay(message) {
    overlayFrame?.contentWindow?.postMessage(message, "*");
  }

  // ── Speech Recognition ───────────────────────────────────────────────────────
  function startRecognition() {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      postToOverlay({ type: "ERROR", message: "Speech recognition not supported. Use Chrome." });
      return;
    }

    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      postToOverlay({ type: "RECOGNITION_STATUS", status: "listening" });
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        postToOverlay({ type: "TRANSCRIPT_INTERIM", text: interim.trim() });
      }
      if (final.trim()) {
        postToOverlay({ type: "TRANSCRIPT_FINAL", text: final.trim() });
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        postToOverlay({ type: "ERROR", message: "Microphone access denied. Please allow in browser settings." });
      } else if (event.error !== "no-speech") {
        postToOverlay({ type: "RECOGNITION_STATUS", status: "error", error: event.error });
      }
    };

    recognition.onend = () => {
      // Auto-restart if still active (recognition stops on silence)
      if (isActive) {
        try { recognition.start(); } catch (_) {}
      } else {
        postToOverlay({ type: "RECOGNITION_STATUS", status: "stopped" });
      }
    };

    try {
      recognition.start();
    } catch (e) {
      postToOverlay({ type: "ERROR", message: "Could not start microphone: " + e.message });
    }
  }

  function stopRecognition() {
    try { recognition?.stop(); } catch (_) {}
    recognition = null;
  }

  // ── Message listener (from popup + overlay iframe) ────────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case "ACTIVATE":
        if (!isActive) {
          isActive = true;
          createOverlay();
          startRecognition();
          chrome.runtime.sendMessage({ type: "EXTENSION_ACTIVATE" });
        }
        break;

      case "DEACTIVATE":
        isActive = false;
        stopRecognition();
        removeOverlay();
        chrome.runtime.sendMessage({ type: "EXTENSION_DEACTIVATE" });
        break;

      case "UPDATE_SETTINGS":
        Object.assign(settings, message.settings);
        if (isActive && overlayFrame) {
          postToOverlay({ type: "SETTINGS_UPDATE", settings });
        }
        break;
    }
  });

  // ── Listen for messages from overlay iframe ───────────────────────────────────
  window.addEventListener("message", (event) => {
    if (!overlayFrame || event.source !== overlayFrame.contentWindow) return;

    switch (event.data?.type) {
      case "OVERLAY_READY":
        postToOverlay({ type: "INIT", settings });
        break;
      case "REQUEST_STOP":
        isActive = false;
        stopRecognition();
        removeOverlay();
        chrome.runtime.sendMessage({ type: "EXTENSION_DEACTIVATE" });
        break;
    }
  });

  // ── Auto-detect if we're in a meeting ────────────────────────────────────────
  function detectMeetingPlatform() {
    const host = location.hostname;
    if (host.includes("zoom.us")) return "Zoom";
    if (host.includes("meet.google.com")) return "Google Meet";
    if (host.includes("teams.microsoft.com") || host.includes("teams.live.com")) return "Microsoft Teams";
    if (host.includes("whereby.com")) return "Whereby";
    if (host.includes("skype.com")) return "Skype";
    return "Meeting";
  }

  // Notify popup that content script is ready
  chrome.storage.local.set({ contentScriptReady: true, platform: detectMeetingPlatform() });
})();
