/**
 * TRADUMUST Extension — Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 * 1. Manage extension state (active tabs, settings)
 * 2. Bridge messages between content script ↔ overlay iframe
 * 3. Handle tab audio capture initiation
 * 4. Persist settings via chrome.storage
 */

// ── State ────────────────────────────────────────────────────────────────────
const activeTabs = new Set();

// ── Message router ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "EXTENSION_ACTIVATE": {
      const tabId = sender.tab?.id;
      if (tabId) {
        activeTabs.add(tabId);
        chrome.action.setBadgeText({ text: "ON", tabId });
        chrome.action.setBadgeBackgroundColor({ color: "#7c3aed", tabId });
      }
      sendResponse({ ok: true });
      break;
    }

    case "EXTENSION_DEACTIVATE": {
      const tabId = sender.tab?.id;
      if (tabId) {
        activeTabs.delete(tabId);
        chrome.action.setBadgeText({ text: "", tabId });
      }
      sendResponse({ ok: true });
      break;
    }

    // Relay transcript from content script → overlay (handled by content script directly via postMessage)
    case "TRANSCRIPT_CHUNK": {
      // Broadcast to all frames in the sender tab
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: "TRANSCRIPT_RELAY",
          text: message.text,
          isFinal: message.isFinal,
        });
      }
      sendResponse({ ok: true });
      break;
    }

    case "GET_SETTINGS": {
      chrome.storage.local.get(
        { avatarModel: "xbot", signLanguage: "ASL", overlayPosition: "bottom-right", overlaySize: "medium" },
        (settings) => sendResponse({ settings })
      );
      return true; // async response
    }

    case "SET_SETTINGS": {
      chrome.storage.local.set(message.settings, () => sendResponse({ ok: true }));
      return true;
    }

    case "IS_ACTIVE": {
      const tabId = sender.tab?.id;
      sendResponse({ active: tabId ? activeTabs.has(tabId) : false });
      break;
    }

    default:
      sendResponse({ error: "Unknown message type" });
  }
});

// ── Tab cleanup ────────────────────────────────────────────────────────────────
chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
});

// ── Install handler ────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.storage.local.set({
      avatarModel: "xbot",
      signLanguage: "ASL",
      overlayPosition: "bottom-right",
      overlaySize: "medium",
      backendUrl: "ws://localhost:8000",
    });
  }
});
