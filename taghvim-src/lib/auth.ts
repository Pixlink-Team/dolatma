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

export async function loginRequest(
  username: string,
  password: string,
): Promise<AuthSession> {
  let response: Response;
  try {
    response = await fetch(`${getApiBase()}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error(
      "اتصال به سرور برقرار نشد. آدرس API یا CORS را در تنظیمات سرور بررسی کنید.",
    );
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 422) {
      throw new Error("نام کاربری یا رمز عبور نادرست است.");
    }
    throw new Error("ورود ناموفق بود.");
  }

  const payload = await response.json();
  const rawUser = (payload.user?.data ?? payload.user) as Record<string, unknown>;
  const user = normalizeUser(rawUser);
  setSession(payload.token, user);
  return { token: payload.token, user };
}

export async function logoutRequest() {
  const session = getSession();
  if (session?.token) {
    try {
      await fetch(`${getApiBase()}/auth/logout`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${session.token}`,
        },
      });
    } catch {
      // ignore
    }
  }
  clearSession();
}

export function getCurrentUser(): AdminUser | null {
  return getSession()?.user ?? null;
}

export function getAuthToken(): string | null {
  return getSession()?.token ?? null;
}

/** Refresh permissions/profile from API into the local session. */
export async function refreshCurrentUser(): Promise<AdminUser | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await apiFetch("/auth/me");
    if (!response.ok) return getCurrentUser();
    const payload = await response.json();
    const rawUser = (payload.data ?? payload.user ?? payload) as Record<
      string,
      unknown
    >;
    const user = normalizeUser(rawUser);
    setSession(token, user);
    return user;
  } catch {
    return getCurrentUser();
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    return await fetch(
      `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`,
      {
        ...init,
        headers,
      },
    );
  } catch {
    throw new Error(
      "اتصال به سرور برقرار نشد. لطفاً API را اجرا کنید و CORS دامنه را تنظیم کنید.",
    );
  }
}
