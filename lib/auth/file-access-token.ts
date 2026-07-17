import { createHmac, timingSafeEqual } from "crypto";
import { getAuthSecret } from "@/lib/auth/secret";

/** Public/admin media links stay valid for a week (matches campaign unlock cookie TTL). */
export const FILE_ACCESS_TTL_SECONDS = 7 * 24 * 60 * 60;

function signPayload(payload: string): string {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createFileAccessQuery(filename: string, ttlSeconds = FILE_ACCESS_TTL_SECONDS): string {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const payload = `${filename}:${expiresAt}`;
  const signature = signPayload(payload);
  return `exp=${expiresAt}&sig=${signature}`;
}

export function verifyFileAccessToken(
  filename: string,
  expRaw: string | null,
  signature: string | null
): boolean {
  if (!filename || !expRaw || !signature) return false;

  const expiresAt = Number(expRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;

  const expected = signPayload(`${filename}:${expiresAt}`);
  return safeEqualHex(signature, expected);
}
