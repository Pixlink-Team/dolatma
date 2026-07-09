import { isoFromGregorian, isoToJalaali, jalaaliMonthLength, jalaaliToISO, todayISO } from "@/lib/jalali";
import type { Ownable } from "@/lib/types";
import {
  isOwnerFilterActive,
  OWNER_DATE_ALL,
  type CampaignDateFilter,
  type CampaignContentSort,
  type OwnerLocationFilter,
} from "@/lib/owner-location-filter";

export function isDateFilterActive(filter: OwnerLocationFilter): boolean {
  return filter.datePreset !== OWNER_DATE_ALL;
}

export function isCampaignContentFilterActive(filter: OwnerLocationFilter): boolean {
  return isOwnerFilterActive(filter) || isDateFilterActive(filter);
}

function iranWeekStart(date: Date): Date {
  const copy = new Date(date);
  const iranDay = (copy.getDay() + 1) % 7;
  copy.setDate(copy.getDate() - iranDay);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function resolveDateFilterRange(filter: CampaignDateFilter): { from: string; to: string } | null {
  if (filter.datePreset === OWNER_DATE_ALL) return null;

  if (filter.datePreset === "this_week") {
    const start = iranWeekStart(new Date());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      from: isoFromGregorian(start.getFullYear(), start.getMonth() + 1, start.getDate()),
      to: isoFromGregorian(end.getFullYear(), end.getMonth() + 1, end.getDate()),
    };
  }

  if (filter.datePreset === "this_month") {
    const { jy, jm } = isoToJalaali(todayISO());
    return {
      from: jalaaliToISO(jy, jm, 1),
      to: jalaaliToISO(jy, jm, jalaaliMonthLength(jy, jm)),
    };
  }

  if (filter.datePreset === "custom") {
    const from = filter.dateFrom.trim();
    const to = filter.dateTo.trim();
    if (!from && !to) return null;
    return { from: from || to, to: to || from };
  }

  return null;
}

export function getOwnableUploadDate(item: Ownable & Record<string, unknown>): string {
  const createdAt = typeof item.createdAt === "string" ? item.createdAt.trim() : "";
  const updatedAt = typeof item.updatedAt === "string" ? item.updatedAt.trim() : "";

  if (createdAt && updatedAt) {
    return updatedAt > createdAt ? updatedAt : createdAt;
  }

  return createdAt || updatedAt;
}

export function getOwnableContentDate(item: Ownable & Record<string, unknown>): string {
  const candidates = [
    item.publishedDate,
    item.activityDate,
    item.reportDate,
    item.meetingDate,
    item.date,
    item.createdAt,
    item.updatedAt,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, 10);
    }
  }

  return "";
}

export function matchesDateFilter(
  item: Ownable,
  filter: OwnerLocationFilter,
  getItemDate?: (item: Ownable) => string | undefined
): boolean {
  const range = resolveDateFilterRange(filter);
  if (!range) return true;

  const itemDate = (
    getItemDate?.(item) ?? getOwnableContentDate(item as Ownable & Record<string, unknown>)
  ).slice(0, 10);
  if (!itemDate) return false;

  return itemDate >= range.from && itemDate <= range.to;
}

export function sortCampaignContent<T>(
  items: T[],
  sort: CampaignContentSort,
  getItemDate: (item: T) => string,
  getSortOrder?: (item: T) => number
): T[] {
  const copy = [...items];

  if (sort === "newest") {
    return copy.sort((a, b) => getItemDate(b).localeCompare(getItemDate(a)));
  }

  if (sort === "oldest") {
    return copy.sort((a, b) => getItemDate(a).localeCompare(getItemDate(b)));
  }

  if (getSortOrder) {
    return copy.sort((a, b) => getSortOrder(a) - getSortOrder(b));
  }

  return copy;
}
