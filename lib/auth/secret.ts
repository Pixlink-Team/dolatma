/**
 * Resolves the HMAC secret used for signed cookies (admin session + page unlock).
 * Never falls back to ADMIN_PASSWORD (that is a login credential, not a signing key).
 *
 * Production runtime: AUTH_SECRET is required and must not be a known weak placeholder.
 * Next.js production builds run with NODE_ENV=production but often without runtime secrets —
 * those are allowed a temporary placeholder so `next build` can complete.
 * Local development: a dedicated fallback is used when AUTH_SECRET is missing/weak.
 */
const WEAK_AUTH_SECRETS = new Set([
  "",
  "change-me",
  "change-me-random-secret-min-32-chars",
  "change-this-secret-in-production",
  "dev-insecure-secret-change-me",
  "password",
  "secret",
  "your_random_auth_secret_at_least_16_chars",
]);

const DEV_FALLBACK_SECRET = "dev-only-auth-secret-do-not-use-in-production";
const BUILD_PLACEHOLDER_SECRET = "build-time-placeholder-not-for-runtime";

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

function isNextProductionBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function normalizeSecret(value: string | undefined): string {
  return (value ?? "").trim();
}

function isWeakSecret(secret: string): boolean {
  if (secret.length < 16) return true;
  return WEAK_AUTH_SECRETS.has(secret.toLowerCase());
}

export function getAuthSecret(): string {
  const fromEnv = normalizeSecret(process.env.AUTH_SECRET);

  if (fromEnv && !isWeakSecret(fromEnv)) {
    return fromEnv;
  }

  if (isNextProductionBuild()) {
    return BUILD_PLACEHOLDER_SECRET;
  }

  if (isProductionRuntime()) {
    throw new Error(
      "AUTH_SECRET must be set to a strong random value (min 16 characters) in production. " +
        "Do not use placeholders like change-this-secret-in-production."
    );
  }

  if (fromEnv && isWeakSecret(fromEnv)) {
    console.warn(
      "[auth] AUTH_SECRET is weak or a known placeholder. Using the local development fallback instead."
    );
  }

  return DEV_FALLBACK_SECRET;
}
