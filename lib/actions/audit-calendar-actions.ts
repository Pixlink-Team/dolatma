"use server";

import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import type { AuditDailyPoint, AuditDayDetail } from "@/lib/audit/types";
import {
  pgGetAuditDailySeriesInRange,
  pgGetAuditDayDetail,
} from "@/lib/db/audit-repository";
import { jalaaliMonthLength, jalaaliToISO } from "@/lib/jalali";
import { isPostgresConfigured } from "@/lib/utils";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function unauthorized<T>(): { success: false; error: string; data?: T } {
  return { success: false, error: "دسترسی مجاز نیست" };
}

export async function getAuditCalendarMonthAction(
  jy: number,
  jm: number
): Promise<{ success: boolean; error?: string; data?: AuditDailyPoint[] }> {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) return unauthorized();
  if (!isPostgresConfigured()) {
    return { success: false, error: "دیتابیس پیکربندی نشده است" };
  }

  if (!Number.isInteger(jy) || jy < 1300 || jy > 1500) {
    return { success: false, error: "سال نامعتبر است" };
  }
  if (!Number.isInteger(jm) || jm < 1 || jm > 12) {
    return { success: false, error: "ماه نامعتبر است" };
  }

  const daysInMonth = jalaaliMonthLength(jy, jm);
  const fromDateIso = jalaaliToISO(jy, jm, 1);
  const toDateIso = jalaaliToISO(jy, jm, daysInMonth);

  try {
    const data = await pgGetAuditDailySeriesInRange(fromDateIso, toDateIso);
    return { success: true, data };
  } catch (error) {
    console.error("getAuditCalendarMonthAction failed:", error);
    return { success: false, error: "بارگذاری تقویم ناموفق بود" };
  }
}

export async function getAuditDayDetailAction(
  dateIso: string
): Promise<{ success: boolean; error?: string; data?: AuditDayDetail }> {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) return unauthorized();
  if (!isPostgresConfigured()) {
    return { success: false, error: "دیتابیس پیکربندی نشده است" };
  }

  const trimmed = dateIso?.trim() ?? "";
  if (!ISO_DATE_RE.test(trimmed)) {
    return { success: false, error: "تاریخ نامعتبر است" };
  }

  try {
    const data = await pgGetAuditDayDetail(trimmed);
    if (!data) {
      return { success: false, error: "داده‌ای برای این روز یافت نشد" };
    }
    return { success: true, data };
  } catch (error) {
    console.error("getAuditDayDetailAction failed:", error);
    return { success: false, error: "بارگذاری جزئیات روز ناموفق بود" };
  }
}
