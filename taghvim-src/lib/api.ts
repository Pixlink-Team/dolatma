import type { TimelineResponse } from "@taghvim/types/calendar";

/**
 * Prefer same-origin `/api/taghvim/v1` (Next rewrite → Laravel).
 * Absolute NEXT_PUBLIC_TAGHVIM_API_URL is only used when explicitly set to a non-local URL.
 */
export function getApiBase(): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_TAGHVIM_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/$/, "");

  // Relative path — always same origin (works with Next rewrites)
  if (!fromEnv || fromEnv.startsWith("/")) {
    const path = fromEnv || "/api/taghvim/v1";
    if (typeof window !== "undefined") {
      return `${window.location.origin}${path}`;
    }
    return path;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const pageIsLocal = host === "localhost" || host === "127.0.0.1";
    const envIsLocal =
      fromEnv.includes("localhost") || fromEnv.includes("127.0.0.1");

    // Never call the visitor's localhost from a public site
    if (!pageIsLocal && envIsLocal) {
      return `${window.location.origin}/api/taghvim/v1`;
    }
  }

  return fromEnv;
}

/** @deprecated Prefer getApiBase() */
export const API_BASE =
  typeof window === "undefined" ? "/api/taghvim/v1" : getApiBase();

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("taghvim_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchTimeline(
  from?: string,
  to?: string,
): Promise<TimelineResponse> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const query = params.toString();
  const base = getApiBase();
  const url = `${base}/timeline${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...authHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load timeline (${response.status})`);
  }

  return response.json();
}

export async function fetchDay(date: string) {
  const response = await fetch(`${getApiBase()}/timeline/${date}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...authHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load day (${response.status})`);
  }

  return response.json();
}
