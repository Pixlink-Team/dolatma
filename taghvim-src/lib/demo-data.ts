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

export async function fetchDemoDataStats(): Promise<DemoDataStats> {
  const response = await apiFetch("/demo-data/stats");
  if (!response.ok) {
    throw new Error("دریافت وضعیت داده نمونه ناموفق بود.");
  }

  const payload = await response.json();
  return payload.data as DemoDataStats;
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
  return payload.data as DemoDataClearResult;
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
  return payload.data as DemoDataRestoreResult;
}
