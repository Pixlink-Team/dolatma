"use server";

import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import type { AuditUserDetail } from "@/lib/audit/types";
import { pgGetAuditUserDetail } from "@/lib/db/audit-repository";
import { isPostgresConfigured } from "@/lib/utils";

function unauthorized(): { success: false; error: string } {
  return { success: false, error: "دسترسی مجاز نیست" };
}

export async function getAuditUserDetailAction(input: {
  actorKey?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
}): Promise<{ success: boolean; error?: string; data?: AuditUserDetail }> {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) return unauthorized();
  if (!isPostgresConfigured()) {
    return { success: false, error: "دیتابیس پیکربندی نشده است" };
  }

  const actorKey = input.actorKey?.trim() || null;
  const actorUserId = input.actorUserId?.trim() || null;
  const actorEmail = input.actorEmail?.trim() || null;

  if (!actorKey && !actorUserId && !actorEmail) {
    return { success: false, error: "شناسه کاربر نامعتبر است" };
  }

  try {
    const data = await pgGetAuditUserDetail({ actorKey, actorUserId, actorEmail });
    if (!data) {
      return { success: false, error: "فعالیتی برای این کاربر یافت نشد" };
    }
    return { success: true, data };
  } catch (error) {
    console.error("getAuditUserDetailAction failed:", error);
    return { success: false, error: "بارگذاری جزئیات کاربر ناموفق بود" };
  }
}
