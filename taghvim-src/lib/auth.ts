import { getApiBase } from "@taghvim/lib/api";
import {
  clearSession,
  getSession,
  setSession,
} from "@taghvim/lib/admin-store";
import type { AdminUser, AuthSession, Permission } from "@taghvim/types/auth";
import {
  ALL_PERMISSIONS,
  canViewAdminViews,
  userHasPermission,
} from "@taghvim/types/auth";

export { canViewAdminViews, userHasPermission };

function normalizeUser(raw: Record<string, unknown>): AdminUser {
  const permissionsRaw = raw.permissions;
  const permissions = Array.isArray(permissionsRaw)
    ? (permissionsRaw.filter((p): p is Permission =>
        typeof p === "string" && ALL_PERMISSIONS.includes(p as Permission),
      ) as Permission[])
    : [];

  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    username:
      raw.username != null && String(raw.username).trim() !== ""
        ? String(raw.username)
        : raw.email != null
          ? String(raw.email)
          : "",
    mobile:
      raw.mobile != null && String(raw.mobile).trim() !== ""
        ? String(raw.mobile)
        : null,
    email: raw.email != null ? String(raw.email) : "",
    role: (raw.role as AdminUser["role"]) ?? "editor",
    is_active: Boolean(raw.is_active ?? true),
    created_at:
      typeof raw.created_at === "string"
        ? raw.created_at
        : new Date().toISOString(),
    parent_id: (raw.parent_id as string | number | null | undefined) ?? null,
    permissions,
    agencyIds: Array.isArray(raw.agencyIds)
      ? raw.agencyIds.map(String)
      : Array.isArray(raw.agency_ids)
        ? (raw.agency_ids as unknown[]).map(String)
        : [],
  };
}

/** @deprecated Bridge removed — kept for call-site compatibility. */
export function normalizeBridgedUser(raw: Record<string, unknown>): AdminUser {
  return normalizeUser(raw);
}

export async function loginRequest(
  _username: string,
  _password: string,
): Promise<AuthSession> {
  throw new Error(
    "ورود جداگانه تقویم حذف شده است؛ از حساب دولتما استفاده کنید.",
  );
}

export async function logoutRequest() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    // ignore
  }
  clearSession();
}

export function getCurrentUser(): AdminUser | null {
  return getSession()?.user ?? null;
}

export function getAuthToken(): string | null {
  return getSession()?.token ?? "dolatma";
}

/** Refresh permissions/profile from local API into the session store. */
export async function refreshCurrentUser(): Promise<AdminUser | null> {
  try {
    const response = await apiFetch("/auth/me");
    if (!response.ok) {
      clearSession();
      return null;
    }
    const payload = await response.json();
    const rawUser = (payload.data ?? payload.user ?? payload) as Record<
      string,
      unknown
    >;
    const user = normalizeUser(rawUser);
    setSession("dolatma", user);
    return user;
  } catch {
    return getCurrentUser();
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    return await fetch(
      `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`,
      {
        ...init,
        headers,
        credentials: "include",
      },
    );
  } catch {
    throw new Error(
      "اتصال به سرور برقرار نشد. لطفاً صفحه را تازه کنید.",
    );
  }
}
