import type { DirectiveBlockerCategory, DirectiveFunnelStage } from "@/lib/types";

export const DIRECTIVE_FUNNEL_STAGES: DirectiveFunnelStage[] = [
  "sent",
  "delivered",
  "seen",
  "accepted",
  "planned",
  "executed",
  "verified",
];

export const DIRECTIVE_FUNNEL_STAGE_LABELS: Record<DirectiveFunnelStage, string> = {
  sent: "ارسال‌شده",
  delivered: "تحویل‌شده",
  seen: "دیده‌شده",
  accepted: "پذیرفته‌شده",
  planned: "برنامه‌ریزی‌شده",
  executed: "اجراشده",
  verified: "تأییدشده",
};

export const DIRECTIVE_BLOCKER_CATEGORY_LABELS: Record<DirectiveBlockerCategory, string> = {
  budget: "کمبود بودجه",
  approval_delay: "تأخیر تأیید",
  missing_file: "نبود فایل",
  missing_capacity: "نبود ظرفیت",
  technical: "مشکل فنی",
  other: "سایر",
};

export const BEST_PRACTICE_SCORE_SUGGEST_THRESHOLD = 8;
