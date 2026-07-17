import { getSql } from "@/lib/db/client";
import { isPostgresConfigured } from "@/lib/utils";

const ALERT_KEY = "security_login_alerts";
const MAX_ALERTS = 50;

export type LoginSecurityAlert = {
  id: string;
  at: string;
  email: string | null;
  ipAddress: string | null;
  reason: "rate_limited" | "repeated_failures";
  failureCount: number;
};

type AlertStore = {
  alerts: LoginSecurityAlert[];
};

function normalizeStore(value: unknown): AlertStore {
  if (!value || typeof value !== "object") return { alerts: [] };
  const record = value as { alerts?: unknown };
  if (!Array.isArray(record.alerts)) return { alerts: [] };
  return {
    alerts: record.alerts
      .filter((item): item is LoginSecurityAlert => Boolean(item && typeof item === "object"))
      .slice(0, MAX_ALERTS),
  };
}

async function readStore(): Promise<AlertStore> {
  if (!isPostgresConfigured()) return { alerts: [] };
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT value FROM system_settings WHERE key = ${ALERT_KEY} LIMIT 1
    `;
    return normalizeStore(rows[0]?.value);
  } catch {
    return { alerts: [] };
  }
}

async function writeStore(store: AlertStore): Promise<void> {
  if (!isPostgresConfigured()) return;
  try {
    const sql = getSql();
    const now = new Date().toISOString();
    await sql`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES (${ALERT_KEY}, ${sql.json(JSON.parse(JSON.stringify(store)))}, ${now})
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = EXCLUDED.updated_at
    `;
  } catch (error) {
    console.error("[security] failed to persist login alerts", error);
  }
}

export async function recordLoginSecurityAlert(input: {
  email: string | null;
  ipAddress: string | null;
  reason: LoginSecurityAlert["reason"];
  failureCount: number;
}): Promise<void> {
  const store = await readStore();
  const alert: LoginSecurityAlert = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    email: input.email,
    ipAddress: input.ipAddress,
    reason: input.reason,
    failureCount: input.failureCount,
  };
  store.alerts = [alert, ...store.alerts].slice(0, MAX_ALERTS);
  await writeStore(store);

  console.warn("[security] suspicious login activity", {
    reason: alert.reason,
    email: alert.email,
    ipAddress: alert.ipAddress,
    failureCount: alert.failureCount,
  });
}

export async function listLoginSecurityAlerts(limit = 20): Promise<LoginSecurityAlert[]> {
  const store = await readStore();
  return store.alerts.slice(0, limit);
}
