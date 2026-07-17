import { createHmac, timingSafeEqual } from "crypto";
import { getAuthSecret } from "@/lib/auth/secret";
import type { AuthSession, SessionRole } from "@/lib/types";
import { buildEnvAdminPayload, buildUserSessionPayload, getSessionTtlMs } from "@/lib/auth/session";

function signPayloadSync(payload: string): string {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("hex");
}

function verifySignature(payload: string, signature: string): boolean {
  const expected = signPayloadSync(payload);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(sigBuffer, expectedBuffer);
}

function parsePayload(payload: string): AuthSession | null {
  const parts = payload.split(":");
  if (parts[0] === "admin" && parts.length === 2) {
    const expiresAt = Number(parts[1]);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
    return { type: "env_admin", userId: null, role: "admin" };
  }

  if (parts[0] === "user" && parts.length === 4) {
    const [, userId, role, expiresAtRaw] = parts;
    const expiresAt = Number(expiresAtRaw);
    if (!userId || (role !== "admin" && role !== "contributor" && role !== "client")) return null;
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
    return { type: "db_user", userId, role: role as SessionRole };
  }

  return null;
}

export function createAdminSessionTokenSync(): string {
  const payload = buildEnvAdminPayload(Date.now() + getSessionTtlMs());
  return `${payload}.${signPayloadSync(payload)}`;
}

export function createUserSessionTokenSync(userId: string, role: SessionRole): string {
  const payload = buildUserSessionPayload(userId, role, Date.now() + getSessionTtlMs());
  return `${payload}.${signPayloadSync(payload)}`;
}

export function parseSessionTokenSync(token: string | undefined | null): AuthSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !verifySignature(payload, signature)) return null;
  return parsePayload(payload);
}

export function verifyAdminSessionTokenSync(token: string | undefined | null): boolean {
  return parseSessionTokenSync(token) !== null;
}
