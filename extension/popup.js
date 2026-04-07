/**
 * TRADUMUST Extension — Popup Script
 */

const SUPPORTED_HOSTS = [
  "app.zoom.us", "zoom.us",
  "meet.google.com",
  "teams.microsoft.com", "teams.live.com",
  "whereby.com", "web.skype.com",
];

const $ = (id) => document.getElementById(id);

// ── Elements ──────────────────────────────────────────────────────────────────
const toggle     = $("main-toggle");
const statusBar  = $("status-bar");
const statusDot  = $("status-dot");
const statusText = $("status-text");
const toggleSub  = $("toggle-sub");
const platformDot   = $("platform-dot");
const platformLabel = $("platform-label");
const warningBox = $("warning-box");

// Settings
const avatarModelSel   = $("avatar-model");
const overlayPosSel    = $("overlay-position");
const overlaySizeSel   = $("overlay-size");
const signLangSel      = $("sign-language");

// ── Load current state ─────────────────────────────────────────────────────────
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab) return;

  const url = new URL(tab.url || "about:blank");
  const onMeetingPage = SUPPORTED_HOSTS.some((h) => url.hostname.includes(h));

  // Platform indicator
  if (onMeetingPage) {
    const name = detectPlatformName(url.hostname);
    platformLabel.textContent = `Detected: ${name}`;
    platformDot.classList.remove("off");
    warningBox.style.display = "none";
  } else {
    platformLabel.textContent = "Not on a meeting page";
    warningBox.style.display = "block";
    toggle.disabled = true;
  }

  // Check if interpreter is already active on this tab
  chrome.runtime.sendMessage({ type: "IS_ACTIVE" }, (res) => {
    if (res?.active) setActiveState(true);
  });
});

// ── Load saved settings ────────────────────────────────────────────────────────
chrome.storage.local.get(
  { avatarModel: "xbot", overlayPosition: "bottom-right", overlaySize: "medium", signLanguage: "ASL" },
  (s) => {
    avatarModelSel.value   = s.avatarModel;
    overlayPosSel.value    = s.overlayPosition;
    overlaySizeSel.value   = s.overlaySize;
    signLangSel.value      = s.signLanguage;
  }
);

// ── Toggle interpreter ─────────────────────────────────────────────────────────
toggle.addEventListener("change", () => {
  const active = toggle.checked;

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: active ? "ACTIVATE" : "DEACTIVATE" }, () => {
      if (chrome.runtime.lastError) {
        // Content script not loaded yet — inject it
        if (active) {
          chrome.scripting.executeScript(
            { target: { tabId: tab.id }, files: ["content.js"] },
            () => {
              setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { type: "ACTIVATE" });
                setActiveState(true);
              }, 300);
            }
          );
          return;
        }
      }
      setActiveState(active);
    });
  });
});

// ── Settings change handlers ────────────────────────────────────────────────────
function saveAndBroadcast() {
  const settings = {
    avatarModel:     avatarModelSel.value,
    overlayPosition: overlayPosSel.value,
    overlaySize:     overlaySizeSel.value,
    signLanguage:    signLangSel.value,
  };
  chrome.storage.local.set(settings);

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "UPDATE_SETTINGS", settings });
    }
  });
}

[avatarModelSel, overlayPosSel, overlaySizeSel, signLangSel].forEach((el) => {
  el.addEventListener("change", saveAndBroadcast);
});

// ── UI helpers ─────────────────────────────────────────────────────────────────
function setActiveState(active) {
  toggle.checked = active;

  if (active) {
    statusBar.className  = "status-bar";
    statusDot.className  = "status-dot pulse";
    statusText.textContent = "Interpreter active — listening for speech";
    toggleSub.textContent  = "Avatar overlay is visible in the meeting";
  } else {
    statusBar.className  = "status-bar inactive";
    statusDot.className  = "status-dot off";
    statusText.textContent = "Interpreter is off";
    toggleSub.textContent  = "Activates the avatar overlay";
  }
}

function detectPlatformName(hostname) {
  if (hostname.includes("zoom"))   return "Zoom";
  if (hostname.includes("google")) return "Google Meet";
  if (hostname.includes("teams"))  return "Microsoft Teams";
  if (hostname.includes("whereby")) return "Whereby";
  if (hostname.includes("skype"))  return "Skype";
  return "Meeting Platform";
}
