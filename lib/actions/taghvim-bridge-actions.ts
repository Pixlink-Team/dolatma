"use server";

import { createHmac } from "crypto";
import {
  hasAnyCampaignPermission,
  isClientUser,
} from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import type { Permission } from "@taghvim/types/auth";
import { ALL_PERMISSIONS } from "@taghvim/types/auth";

export type TaghvimBridgeResult =
  | {
      success: true;
      token: string;
      user: Record<string, unknown>;
    }
  | { success: false; error: string };

type MappedIdentity = {
  external_id: string;
  name: string;
  username: string;
  email: string;
  role: "super_admin" | "editor";
  permissions: Permission[];
};

function taghvimApiBase(): string {
  return (
    process.env.TAGHVIM_API_INTERNAL_URL ||
    process.env.TAGHVIM_BACKEND_URL ||
    "https://taghvim.pixlink.ir"
  ).replace(/\/$/, "");
}

function sanitizeUsername(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return cleaned.slice(0, 64) || "dm_user";
}

/** Deterministic strong password for a dolatma→taghvim mirrored user. */
function derivedPassword(externalId: string): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.TAGHVIM_BRIDGE_KEY ||
    process.env.DOLATMA_SERVICE_KEY ||
    "dolatma-taghvim-dev";
  const digest = createHmac("sha256", secret)
    .update(`taghvim-sso:${externalId}`)
    .digest("base64url");
  // Laravel Password::defaults — mixed case, number, symbol, length ≥ 10
  return `Dm!${digest.slice(0, 18)}9`;
}

function mapDolatmaToTaghvim(session: {
  type: string;
  userId: string | null;
  role: string;
  email?: string;
  name?: string;
}): MappedIdentity {
  const externalId = String(
    session.userId || session.email || session.type || "admin"
  );
  const username = sanitizeUsername(`dm_${externalId}`);
  const email =
    session.email?.trim() || `${username}@dolatma.local`.toLowerCase();
  const name =
    session.name?.trim() ||
    session.email?.trim() ||
    (session.type === "env_admin" || session.role === "admin"
      ? "مدیر سیستم"
      : "کاربر دولتما");

  const elevated =
    session.type === "env_admin" ||
    session.role === "admin" ||
    session.role === "client" ||
    session.role === "reis";

  if (elevated) {
    return {
      external_id: externalId,
      name,
      username,
      email,
      role: "super_admin",
      permissions: [...ALL_PERMISSIONS],
    };
  }

  return {
    external_id: externalId,
    name,
    username,
    email,
    role: "editor",
    permissions: [
      "view_admin_views",
      "manage_content",
      "publish",
      "manage_subusers",
      "view_archive",
    ],
  };
}

async function laravelLogin(
  username: string,
  password: string
): Promise<{ token: string; user: Record<string, unknown> } | null> {
  const response = await fetch(`${taghvimApiBase()}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    token?: string;
    user?: Record<string, unknown>;
  };
  if (!data.token || !data.user) return null;
  return { token: data.token, user: data.user };
}

async function tryNativeBridge(
  identity: MappedIdentity,
  serviceKey: string
): Promise<TaghvimBridgeResult | null> {
  const response = await fetch(`${taghvimApiBase()}/api/v1/auth/bridge`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Taghvim-Bridge-Key": serviceKey,
    },
    body: JSON.stringify(identity),
    cache: "no-store",
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("[taghvim-bridge] native failed", response.status, text);
    return {
      success: false,
      error:
        response.status === 401
          ? "کلید پل تقویم نامعتبر است."
          : "اتصال یکپارچه به تقویم برقرار نشد.",
    };
  }

  const data = (await response.json()) as {
    token?: string;
    user?: Record<string, unknown>;
  };
  if (!data.token || !data.user) {
    return { success: false, error: "پاسخ نامعتبر از سامانه تقویم." };
  }
  return { success: true, token: data.token, user: data.user };
}

/**
 * Fallback when Laravel /auth/bridge is not deployed yet:
 * bootstrap with a service admin, upsert mirrored user, then login as that user.
 */
async function mirrorUserViaAdminApi(
  identity: MappedIdentity
): Promise<TaghvimBridgeResult> {
  const serviceUser =
    process.env.TAGHVIM_SERVICE_USERNAME?.trim() ||
    process.env.TAGHVIM_SERVICE_EMAIL?.trim() ||
    "";
  const servicePass = process.env.TAGHVIM_SERVICE_PASSWORD?.trim() || "";

  if (!serviceUser || !servicePass) {
    return {
      success: false,
      error:
        "برای ورود بدون لاگین، TAGHVIM_SERVICE_USERNAME و TAGHVIM_SERVICE_PASSWORD را در دولتما تنظیم کنید (یا API تقویم را با endpoint bridge آپدیت کنید).",
    };
  }

  const adminSession = await laravelLogin(serviceUser, servicePass);
  if (!adminSession) {
    return {
      success: false,
      error: "ورود سرویس تقویم ناموفق بود. مشخصات TAGHVIM_SERVICE_* را بررسی کنید.",
    };
  }

  const password = derivedPassword(identity.external_id);
  const authHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminSession.token}`,
  };

  const listRes = await fetch(`${taghvimApiBase()}/api/v1/users`, {
    headers: authHeaders,
    cache: "no-store",
  });
  if (!listRes.ok) {
    return {
      success: false,
      error: "دریافت فهرست کاربران تقویم ناموفق بود.",
    };
  }

  const listJson = (await listRes.json()) as {
    data?: Array<Record<string, unknown>>;
  };
  const users = Array.isArray(listJson.data) ? listJson.data : [];
  const existing = users.find((u) => {
    const username = String(u.username ?? "");
    const email = String(u.email ?? "");
    return username === identity.username || email === identity.email;
  });

  if (existing?.id != null) {
    const updateRes = await fetch(
      `${taghvimApiBase()}/api/v1/users/${existing.id}`,
      {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          name: identity.name,
          username: identity.username,
          email: identity.email,
          role: identity.role,
          permissions: identity.permissions,
          is_active: true,
          password,
        }),
        cache: "no-store",
      }
    );
    if (!updateRes.ok) {
      const text = await updateRes.text().catch(() => "");
      console.error("[taghvim-bridge] update user failed", updateRes.status, text);
      return { success: false, error: "به‌روزرسانی کاربر تقویم ناموفق بود." };
    }
  } else {
    const createRes = await fetch(`${taghvimApiBase()}/api/v1/users`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: identity.name,
        username: identity.username,
        email: identity.email,
        role: identity.role,
        permissions: identity.permissions,
        is_active: true,
        password,
      }),
      cache: "no-store",
    });
    if (!createRes.ok) {
      const text = await createRes.text().catch(() => "");
      console.error("[taghvim-bridge] create user failed", createRes.status, text);
      return { success: false, error: "ایجاد کاربر تقویم ناموفق بود." };
    }
  }

  const userSession = await laravelLogin(identity.username, password);
  if (!userSession) {
    return {
      success: false,
      error: "ورود خودکار کاربر دولتما به تقویم ناموفق بود.",
    };
  }

  return {
    success: true,
    token: userSession.token,
    user: userSession.user,
  };
}

/**
 * Mint a Laravel Sanctum token for the current dolatma user (no separate login UI).
 */
export async function bridgeTaghvimSessionAction(): Promise<TaghvimBridgeResult> {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "نشست دولتما یافت نشد." };
  }

  const allowed =
    isFullAdmin(session) ||
    isClientUser(session) ||
    session.role === "reis" ||
    (await hasAnyCampaignPermission(session, "defenseCalendar"));

  if (!allowed) {
    return { success: false, error: "دسترسی به تقویم دفاع ندارید." };
  }

  const identity = mapDolatmaToTaghvim(session);
  const serviceKey =
    process.env.TAGHVIM_BRIDGE_KEY ||
    process.env.DOLATMA_SERVICE_KEY ||
    process.env.AUTH_SECRET ||
    "";

  try {
    if (serviceKey) {
      const native = await tryNativeBridge(identity, serviceKey);
      if (native) return native;
    }

    // Production taghvim API may not have /auth/bridge deployed yet.
    return await mirrorUserViaAdminApi(identity);
  } catch (error) {
    console.error("[taghvim-bridge] exception", error);
    return {
      success: false,
      error: "اتصال به سامانه تقویم برقرار نشد.",
    };
  }
}
