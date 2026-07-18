/**
 * Only allow same-origin relative paths to avoid open redirects.
 * Rejects protocol-relative URLs ("//evil.com") and external URLs.
 */
export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback = "/admin"
): string {
  if (!value) return fallback;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(trimmed, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
