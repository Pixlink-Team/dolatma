import { createHash, createHmac, randomInt, timingSafeEqual } from "crypto";
import { getAuthSecret } from "@/lib/auth/secret";

export const OTP_LENGTH = 5;
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 90 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const VERIFICATION_TTL_MS = 30 * 60 * 1000;

export function generateOtpCode(): string {
  const max = 10 ** OTP_LENGTH;
  const min = 10 ** (OTP_LENGTH - 1);
  return String(randomInt(min, max));
}

export function hashOtp(phone09: string, code: string): string {
  return createHash("sha256")
    .update(`${phone09}:${code}:${getAuthSecret()}`)
    .digest("hex");
}

export function safeEqualHash(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function sign(payload: string): string {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("hex");
}

/** Short-lived token proving the phone was OTP-verified. */
export function createPhoneVerificationToken(phone09: string): string {
  const expiresAt = Date.now() + VERIFICATION_TTL_MS;
  const payload = `prereg:${phone09}:${expiresAt}`;
  return `${expiresAt}.${sign(payload)}`;
}

export function verifyPhoneVerificationToken(phone09: string, token: string): boolean {
  const [expRaw, signature] = token.split(".");
  if (!expRaw || !signature) return false;
  const expiresAt = Number(expRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
  const expected = sign(`prereg:${phone09}:${expiresAt}`);
  return safeEqualHash(signature, expected);
}
