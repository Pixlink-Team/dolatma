import type { ActivityType } from "@/lib/types";

export const activityTypeOptions: ActivityType[] = [
  "magazine",
  "newspaper",
  "tract",
  "booth",
  "field",
  "poetry",
  "painting",
  "exhibition",
  "other",
];

export const activityTypeLabels: Record<ActivityType, string> = {
  magazine: "آگهی مجله",
  newspaper: "آگهی روزنامه",
  tract: "تراکت و بروشور",
  booth: "غرفه‌گذاری",
  field: "برنامه میدانی",
  poetry: "شعرخوانی",
  painting: "نقاشی و هنر",
  exhibition: "نمایشگاه",
  other: "سایر",
};

export function getActivityTypeLabel(type: string): string {
  return activityTypeLabels[type as ActivityType] ?? type;
}
