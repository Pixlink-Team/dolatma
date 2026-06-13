import { createHmac, timingSafeEqual } from "crypto";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET ??
    process.env.ADMIN_PASSWORD ??
    "dev-insecure-secret-change-me"
  );
}

function signPayloadSync(payload: string): string {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("hex");
}

export function createAdminSessionTokenSync(): string {
  const payload = `admin:${Date.now() + SESSION_TTL_MS}`;
  return `${payload}.${signPayloadSync(payload)}`;
}

export function verifyAdminSessionTokenSync(token: string | undefined | null): boolean {
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = signPayloadSync(payload);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (sigBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return false;

  const expiresAt = Number(payload.split(":")[1]);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}
