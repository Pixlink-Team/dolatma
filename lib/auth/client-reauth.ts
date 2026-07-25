"use client";

const CLEAR_SESSION_PATH = "/api/auth/clear-session";

/** Messages that mean the session is gone — re-auth instead of showing an error toast. */
export function isSessionExpiredMessage(message: unknown): boolean {
  if (typeof message !== "string") return false;
  const normalized = message.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === "unauthorized") return true;
  if (normalized.includes("باید وارد شوید")) return true;
  if (normalized.includes("session expired")) return true;
  return false;
}

/** Soft-logout in the browser: clear cookie then land on login. */
export function forceClientReauth() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path.startsWith("/admin/login") || path.startsWith(CLEAR_SESSION_PATH)) return;
  window.location.assign(CLEAR_SESSION_PATH);
}

/**
 * If the value is a session-expiry signal, redirect to login and return true.
 * Otherwise return false so the caller can show a normal error.
 */
export function redirectIfSessionExpired(message: unknown): boolean {
  if (!isSessionExpiredMessage(message)) return false;
  forceClientReauth();
  return true;
}
