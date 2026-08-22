import { refreshSite } from "@/lib/app-errors/catalog";

const RELOAD_STATE_KEY = "dolatma:stale-reload";
const MAX_AUTO_RELOADS = 2;
const RELOAD_WINDOW_MS = 60_000;

type ReloadState = {
  count: number;
  firstAt: number;
};

function readReloadState(now: number): ReloadState {
  if (typeof window === "undefined") {
    return { count: 0, firstAt: now };
  }

  try {
    const raw = sessionStorage.getItem(RELOAD_STATE_KEY);
    if (!raw) return { count: 0, firstAt: now };
    const parsed = JSON.parse(raw) as Partial<ReloadState>;
    const count = typeof parsed.count === "number" ? parsed.count : 0;
    const firstAt = typeof parsed.firstAt === "number" ? parsed.firstAt : now;
    if (now - firstAt > RELOAD_WINDOW_MS) {
      return { count: 0, firstAt: now };
    }
    return { count, firstAt };
  } catch {
    return { count: 0, firstAt: now };
  }
}

function writeReloadState(state: ReloadState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(RELOAD_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / private mode errors.
  }
}

/** Whether another automatic reload should be attempted for a stale-page error. */
export function canAutoRefreshStalePage(): boolean {
  const state = readReloadState(Date.now());
  return state.count < MAX_AUTO_RELOADS;
}

/**
 * Reload once or twice when the client bundle is stale.
 * Returns true when a reload was scheduled.
 */
export function scheduleAutoRefreshStalePage(options?: { delayMs?: number }): boolean {
  if (typeof window === "undefined") return false;

  const now = Date.now();
  const state = readReloadState(now);
  if (state.count >= MAX_AUTO_RELOADS) return false;

  writeReloadState({
    count: state.count + 1,
    firstAt: state.firstAt || now,
  });

  const delayMs = options?.delayMs ?? 250;
  window.setTimeout(() => refreshSite(), delayMs);
  return true;
}

/** Proactive deploy detection — always reload when the server build id changed. */
export function refreshForNewBuild(): void {
  refreshSite();
}
