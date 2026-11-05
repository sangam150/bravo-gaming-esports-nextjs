export const AUTH_SESSION_EVENT = "bravo:session-changed";
export const AUTH_SESSION_STORAGE_KEY = "bravo-session-revision";

/** Notify tabs without persisting credentials or trusting a client-provided role. */
export function notifyAuthSessionChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
  try {
    // This is an invalidation marker, not a credential. Avoid secure-context
    // APIs so local/LAN previews also synchronize sign-in and sign-out.
    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, `${Date.now()}:${Math.random().toString(36).slice(2)}`);
  } catch {
    // Focus/visibility checks still reconcile cookies when storage is unavailable.
  }
}
