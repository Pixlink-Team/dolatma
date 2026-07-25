export const DEFAULT_USER_EMAIL_DOMAIN = "example.com";

export function normalizeStoredUserEmail(usernameOrEmail: string): string {
  const value = usernameOrEmail.trim().toLowerCase();
  if (!value) return value;
  if (value.includes("@")) return value;
  return `${value}@${DEFAULT_USER_EMAIL_DOMAIN}`;
}

/**
 * Resolve the email to store when the admin form may send a username without a domain.
 * If the username matches an existing user's local-part, keep that user's full email
 * so edits (e.g. permissions-only) do not rewrite `ali@company.ir` → `ali@example.com`
 * and hit unique-email conflicts.
 */
export function resolveStoredUserEmail(
  usernameOrEmail: string,
  existingEmail?: string | null
): string {
  const value = usernameOrEmail.trim().toLowerCase();
  if (!value) return value;
  if (value.includes("@")) return value;

  const existing = existingEmail?.trim().toLowerCase() || null;
  if (existing && getLoginUsernameFromEmail(existing) === value) {
    return existing;
  }

  return `${value}@${DEFAULT_USER_EMAIL_DOMAIN}`;
}

export function buildLoginEmailCandidates(identifier: string): string[] {
  const trimmed = identifier.trim().toLowerCase();
  if (!trimmed) return [];

  if (trimmed.includes("@")) {
    return [trimmed];
  }

  return [trimmed, `${trimmed}@${DEFAULT_USER_EMAIL_DOMAIN}`];
}

export function getLoginUsernameFromEmail(email: string | null | undefined): string {
  const value = typeof email === "string" ? email : "";
  const atIndex = value.indexOf("@");
  if (atIndex <= 0) return value;
  return value.slice(0, atIndex);
}
