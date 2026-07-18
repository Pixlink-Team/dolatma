/** Shared auth for Coolify / scheduled cron HTTP endpoints. */
export function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authorization = request.headers.get("authorization");
  const bearer =
    authorization?.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7).trim()
      : null;
  const headerSecret = request.headers.get("x-cron-secret")?.trim() ?? null;

  return bearer === secret || headerSecret === secret;
}
