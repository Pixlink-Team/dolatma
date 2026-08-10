import { apiFetch } from "@taghvim/lib/auth";

export type DemoDataStats = {
  days: number;
  events: number;
  cleared: boolean;
};

export type DemoDataClearResult = {
  days: number;
  events: number;
  media: number;
};

export type DemoDataRestoreResult = {
  days: number;
  events: number;
  media_attached: number;
};

function asNonNegInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function normalizeStats(raw: unknown): DemoDataStats {
  const data =
    raw && typeof raw === "object" && "data" in raw
      ? (raw as { data: Record<string, unknown> }).data
      : (raw as Record<string, unknown> | null);
  const days = asNonNegInt(data?.days);
  const enemy = asNonNegInt(data?.enemy_actions);
  const gov = asNonNegInt(data?.government_actions);
  const events =
    data?.events != null ? asNonNegInt(data.events) : enemy + gov;
  const cleared =
    typeof data?.cleared === "boolean"
      ? data.cleared
      : days === 0 && events === 0;
  return { days, events, cleared };
}

function normalizeClearResult(raw: unknown): DemoDataClearResult {
  const data =
    raw && typeof raw === "object" && "data" in raw
      ? (raw as { data: Record<string, unknown> }).data
      : (raw as Record<string, unknown> | null);
  return {
    days: asNonNegInt(data?.days),
    events: asNonNegInt(data?.events),
    media: asNonNegInt(data?.media),
  };
}

export async function fetchDemoDataStats(): Promise<DemoDataStats> {
  const response = await apiFetch("/demo-data/stats");
  if (!response.ok) {
    throw new Error("دریافت وضعیت داده نمونه ناموفق بود.");
  }

  const payload = await response.json();
  return normalizeStats(payload);
}

export async function clearDemoDataOnServer(): Promise<DemoDataClearResult> {
  const response = await apiFetch("/demo-data/clear", { method: "POST" });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      typeof payload?.message === "string"
        ? payload.message
        : "پاک کردن داده نمونه از سرور ناموفق بود.",
    );
  }

  const payload = await response.json();
  return normalizeClearResult(payload);
}

export async function restoreDemoDataOnServer(): Promise<DemoDataRestoreResult> {
  const response = await apiFetch("/demo-data/restore", { method: "POST" });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      typeof payload?.message === "string"
        ? payload.message
        : "بازیابی داده نمونه از سرور ناموفق بود.",
    );
  }

  const payload = await response.json();
  const data =
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data: Record<string, unknown> }).data
      : null;
  if (!data) {
    throw new Error("بازیابی داده نمونه از سرور ناموفق بود.");
  }
  return {
    days: asNonNegInt(data.days),
    events: asNonNegInt(data.events),
    media_attached: asNonNegInt(data.media_attached),
  };
}
