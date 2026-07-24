import { timingSafeEqual } from "crypto";

function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Shared auth for Coolify / scheduled cron HTTP endpoints. */
export function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16) return false;

  const authorization = request.headers.get("authorization");
  const bearer =
    authorization?.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7).trim()
      : null;
  const headerSecret = request.headers.get("x-cron-secret")?.trim() ?? null;

  return (
    (bearer !== null && safeEqualString(bearer, secret)) ||
    (headerSecret !== null && safeEqualString(headerSecret, secret))
  );
}
