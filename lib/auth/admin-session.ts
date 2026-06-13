const SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const LEGACY_MOCK_COOKIE = "mock_admin";

function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET ??
    process.env.ADMIN_PASSWORD ??
    "dev-insecure-secret-change-me"
  );
}

export function getAdminSessionCookieName() {
  return SESSION_COOKIE;
}

export function getLegacyMockCookieName() {
  return LEGACY_MOCK_COOKIE;
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "password";
  return email === adminEmail && password === adminPassword;
}

async function signPayloadAsync(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function buildAdminSessionToken(expiresAt = Date.now() + SESSION_TTL_MS): string {
  return `admin:${expiresAt}`;
}

export async function createAdminSessionToken(): Promise<string> {
  const payload = buildAdminSessionToken();
  const signature = await signPayloadAsync(payload);
  return `${payload}.${signature}`;
}

export async function verifyAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = await signPayloadAsync(payload);
  if (signature.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < signature.length; i += 1) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (mismatch !== 0) return false;

  const expiresAt = Number(payload.split(":")[1]);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export function getAdminSessionCookieOptions(maxAge = 60 * 60 * 24) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
}
