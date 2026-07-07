/** CWASA 3D avatar — local cache under /asl-avatar with remote SiGML fallback. */
export const ASL_AVATAR_3D_ORIGIN = "https://3dasl-avatar.vercel.app";
export const ASL_AVATAR_LOCAL_BASE = "/asl-avatar";
export const ASL_AVATAR_EMBED_PATH = "/asl-avatar/embed.html";
export const ASL_AVATAR_SW_PATH = "/asl-avatar/sw.js";

export const ASL_AVATAR_OPTIONS = [
  { id: "anna", label: "Anna", description: "Default signer" },
  { id: "marc", label: "Marc", description: "Male signer" },
  { id: "francoise", label: "Françoise", description: "Alternate signer" },
] as const;

export type AslAvatarId = (typeof ASL_AVATAR_OPTIONS)[number]["id"];

export function aslAvatarEmbedSrc(options?: { embed?: boolean; text?: string; avatar?: AslAvatarId }) {
  const params = new URLSearchParams();
  if (options?.embed) params.set("embed", "1");
  if (options?.text) params.set("text", options.text);
  if (options?.avatar) params.set("avatar", options.avatar);
  const q = params.toString();
  return `${ASL_AVATAR_EMBED_PATH}${q ? `?${q}` : ""}`;
}

export function postPlayToAslAvatar(iframe: HTMLIFrameElement | null, text: string) {
  iframe?.contentWindow?.postMessage({ type: "TRADUMUST_PLAY", text }, "*");
}

export function postPlayGlossesToAslAvatar(
  iframe: HTMLIFrameElement | null,
  glosses: string[],
  sigmlBase?: string
) {
  iframe?.contentWindow?.postMessage(
    { type: "TRADUMUST_PLAY_GLOSSES", glosses, sigmlBase },
    "*"
  );
}

export function postResetAslAvatar(iframe: HTMLIFrameElement | null) {
  iframe?.contentWindow?.postMessage({ type: "TRADUMUST_RESET" }, "*");
}

export function postSetAslAvatar(iframe: HTMLIFrameElement | null, avatar: AslAvatarId) {
  iframe?.contentWindow?.postMessage({ type: "TRADUMUST_SET_AVATAR", avatar }, "*");
}

/** Register service worker that caches CWASA assets + SiGML gloss files. */
export function registerAslAvatarServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(ASL_AVATAR_SW_PATH, { scope: `${ASL_AVATAR_LOCAL_BASE}/` }).catch(() => {});
}
