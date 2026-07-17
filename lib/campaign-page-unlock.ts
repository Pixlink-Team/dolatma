import { cookies } from "next/headers";
import { getAuthSecret } from "@/lib/auth/secret";

const UNLOCK_TTL_SECONDS = 7 * 24 * 60 * 60;

async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function getCampaignPageUnlockCookieName(slug: string): string {
  const safe = slug.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
  return `campaign_page_unlock_${safe}`;
}

export async function createCampaignPageUnlockToken(
  slug: string,
  passwordHash: string
): Promise<string> {
  const expiresAt = Date.now() + UNLOCK_TTL_SECONDS * 1000;
  // Use | so bcrypt hashes (which contain :) stay intact.
  const payload = `${slug}|${expiresAt}|${passwordHash}`;
  const signature = await signPayload(payload);
  return `${payload}.${signature}`;
}

export async function verifyCampaignPageUnlockToken(
  token: string | undefined | null,
  slug: string,
  passwordHash: string
): Promise<boolean> {
  if (!token || !passwordHash) return false;

  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex <= 0) return false;
  const payload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  if (!payload || !signature) return false;

  const expected = await signPayload(payload);
  if (signature.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < signature.length; i += 1) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (mismatch !== 0) return false;

  const firstSep = payload.indexOf("|");
  const secondSep = payload.indexOf("|", firstSep + 1);
  if (firstSep <= 0 || secondSep <= firstSep) return false;

  const tokenSlug = payload.slice(0, firstSep);
  const expiresAtRaw = payload.slice(firstSep + 1, secondSep);
  const tokenHash = payload.slice(secondSep + 1);

  if (tokenSlug !== slug) return false;
  if (tokenHash !== passwordHash) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;

  return true;
}

export function getCampaignPageUnlockCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: UNLOCK_TTL_SECONDS,
  };
}

export async function isCampaignPageUnlocked(
  slug: string,
  passwordHash: string | null | undefined
): Promise<boolean> {
  if (!passwordHash) return true;
  const cookieStore = await cookies();
  const token = cookieStore.get(getCampaignPageUnlockCookieName(slug))?.value;
  return verifyCampaignPageUnlockToken(token, slug, passwordHash);
}

/** Strip password hashes before sending settings to the browser. */
export function sanitizePublicCampaignSettings<T extends { meetingsViewPasswordHash?: string | null; pageViewPasswordHash?: string | null }>(
  settings: T
): T {
  return {
    ...settings,
    meetingsViewPasswordHash: null,
    pageViewPasswordHash: null,
  };
}
