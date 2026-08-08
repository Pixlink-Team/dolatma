"use server";

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

function mapDolatmaToTaghvim(session: {
  type: string;
  userId: string | null;
  role: string;
  email?: string;
  name?: string;
}): {
  external_id: string;
  name: string;
  username: string;
  email: string;
  role: "super_admin" | "editor";
  permissions: Permission[];
} {
  const externalId = session.userId || session.email || session.type || "admin";
  const username = sanitizeUsername(`dm_${externalId}`);
  const email =
    session.email?.trim() ||
    `${username}@dolatma.local`.toLowerCase();
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
      external_id: String(externalId),
      name,
      username,
      email,
      role: "super_admin",
      permissions: [...ALL_PERMISSIONS],
    };
  }

  return {
    external_id: String(externalId),
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

/**
 * Mint a Laravel Sanctum token for the current dolatma user (SSO into defense calendar).
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

  const serviceKey = process.env.TAGHVIM_BRIDGE_KEY || process.env.DOLATMA_SERVICE_KEY;
  if (!serviceKey) {
    return {
      success: false,
      error:
        "کلید پل تقویم تنظیم نشده است (TAGHVIM_BRIDGE_KEY).",
    };
  }

  const payload = mapDolatmaToTaghvim(session);

  try {
    const response = await fetch(`${taghvimApiBase()}/api/v1/auth/bridge`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Taghvim-Bridge-Key": serviceKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[taghvim-bridge] failed", response.status, text);
      return {
        success: false,
        error:
          response.status === 401
            ? "کلید پل تقویم نامعتبر است."
            : "اتصال به سامانه تقویم برقرار نشد.",
      };
    }

    const data = (await response.json()) as {
      token?: string;
      user?: Record<string, unknown>;
    };

    if (!data.token || !data.user) {
      return { success: false, error: "پاسخ نامعتبر از سامانه تقویم." };
    }

    return {
      success: true,
      token: data.token,
      user: data.user,
    };
  } catch (error) {
    console.error("[taghvim-bridge] exception", error);
    return {
      success: false,
      error: "اتصال به سامانه تقویم برقرار نشد.",
    };
  }
}
