import { getSql } from "@/lib/db/client";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { normalizeStoredUserEmail } from "@/lib/auth/user-login";
import { isPostgresConfigured } from "@/lib/utils";

const ADMIN_CREDENTIALS_KEY = "admin_credentials";

export type StoredAdminCredentials = {
  email: string;
  passwordHash: string;
};

export type EffectiveAdminCredentials = {
  email: string;
  source: "database" | "env";
};

function getEnvAdminEmail() {
  return (process.env.ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
}

function getEnvAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? "password";
}

function normalizeStoredCredentials(value: unknown): StoredAdminCredentials | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<StoredAdminCredentials>;
  const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
  const passwordHash = typeof record.passwordHash === "string" ? record.passwordHash.trim() : "";
  if (!email || !passwordHash) return null;
  return { email, passwordHash };
}

export async function pgGetStoredAdminCredentials(): Promise<StoredAdminCredentials | null> {
  if (!isPostgresConfigured()) return null;

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT value FROM system_settings WHERE key = ${ADMIN_CREDENTIALS_KEY} LIMIT 1
    `;
    return normalizeStoredCredentials(rows[0]?.value);
  } catch {
    return null;
  }
}

export async function getEffectiveAdminCredentials(): Promise<EffectiveAdminCredentials> {
  const stored = await pgGetStoredAdminCredentials();
  if (stored) {
    return { email: stored.email, source: "database" };
  }

  return { email: getEnvAdminEmail(), source: "env" };
}

export async function verifyEffectiveAdminCredentials(
  email: string,
  password: string
): Promise<boolean> {
  const loginEmail = email.trim().toLowerCase();
  if (!loginEmail || !password) return false;

  const stored = await pgGetStoredAdminCredentials();
  if (stored) {
    if (loginEmail !== stored.email && normalizeStoredUserEmail(loginEmail) !== stored.email) {
      return false;
    }
    return verifyPassword(password, stored.passwordHash);
  }

  const envEmail = getEnvAdminEmail();
  const envPassword = getEnvAdminPassword();
  return (
    (loginEmail === envEmail || normalizeStoredUserEmail(loginEmail) === envEmail) &&
    password === envPassword
  );
}

export async function pgSaveAdminCredentials(data: {
  email: string;
  password?: string;
}): Promise<{ success: true; email: string } | { success: false; error: string }> {
  if (!isPostgresConfigured()) {
    return { success: false, error: "Database required" };
  }

  const email = normalizeStoredUserEmail(data.email);
  if (!email) {
    return { success: false, error: "نام کاربری الزامی است" };
  }

  const existing = await pgGetStoredAdminCredentials();
  let passwordHash = existing?.passwordHash ?? "";

  if (data.password?.trim()) {
    if (data.password.trim().length < 4) {
      return { success: false, error: "رمز عبور باید حداقل ۴ کاراکتر باشد" };
    }
    passwordHash = await hashPassword(data.password.trim());
  }

  if (!passwordHash) {
    // First-time save from UI without password: seed from current env password.
    passwordHash = await hashPassword(getEnvAdminPassword());
  }

  const sql = getSql();
  const now = new Date().toISOString();
  const payload: StoredAdminCredentials = { email, passwordHash };

  await sql`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (${ADMIN_CREDENTIALS_KEY}, ${sql.json(JSON.parse(JSON.stringify(payload)))}, ${now})
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = EXCLUDED.updated_at
  `;

  return { success: true, email };
}
