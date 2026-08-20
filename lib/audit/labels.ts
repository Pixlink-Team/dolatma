import type { AuditCategory } from "@/lib/audit/types";

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  auth: "احراز هویت",
  navigation: "پیمایش",
  content: "محتوا",
  ui: "کلیک",
  admin: "مدیریت",
  system: "سیستم",
};

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "ورود",
  "auth.logout": "خروج",
  "auth.login_failed": "ورود ناموفق",
  "navigation.page_view": "بازدید صفحه",
  "ui.click": "کلیک روی دکمه",
  "ui.error": "خطای رابط کاربری",
  "content.create": "ایجاد محتوا",
  "content.update": "ویرایش محتوا",
  "content.delete": "حذف محتوا",
  "content.score": "امتیازدهی",
  "content.review.reject": "رد محتوا برای اصلاح",
  "content.review.approve": "تأیید محتوای اصلاح‌شده",
  "content.review.resubmit": "ارسال مجدد محتوا",
  "admin.settings_update": "به‌روزرسانی تنظیمات",
  "campaign.daily_posting_limits": "محدودیت بارگذاری روزانه",
  "user.create": "ایجاد کاربر",
  "user.update": "ویرایش کاربر",
  "user.delete": "حذف کاربر",
  "profile.update": "ویرایش پروفایل",
  "problem.report": "گزارش مشکل",
  "problem.triage": "رسیدگی به گزارش مشکل",
  "problem.reply": "پاسخ به گزارش مشکل",
  "chat.message": "پیام چت",
  "chat.message.edit": "ویرایش پیام چت",
  "chat.message.delete": "حذف پیام چت",
};

const ENTITY_LABELS: Record<string, string> = {
  campaign: "راستا",
  billboard: "بیلبورد",
  poster: "پوستر",
  poster_version: "نسخه پوستر",
  video: "ویدیو",
  video_version: "نسخه ویدیو",
  media_category: "دسته رسانه",
  analytics_metric: "سایت‌ها",
  company_website: "سایت‌ها",
  submission: "مشارکت",
  file: "فایل",
  raw_media: "راش تصویر",
  social_post: "پست شبکه اجتماعی",
  social_platform_stat: "آمار شبکه اجتماعی",
  broadcast_report: "گزارش پخش",
  activity: "اقدام",
  meeting: "جلسه",
  sms_send_report: "گزارش ارسال پیام",
  user: "کاربر",
  content_review: "بازبینی محتوا",
  content_message: "پیام محتوا",
  chat_message: "پیام چت",
};

export function getAuditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function getAuditEntityLabel(entityType: string | null): string {
  if (!entityType) return "—";
  return ENTITY_LABELS[entityType] ?? entityType;
}

export function getAuditRoleLabel(role: string | null): string {
  switch (role) {
    case "admin":
      return "مدیر سیستم";
    case "org_user":
      return "کاربر دستگاه";
    case "contributor":
      return "کاربر دستگاه";
    case "ministry_parent":
      return "مدیر";
    case "sub_user":
      return "کاربر دستگاه";
    case "client":
      return "کارفرما";
    case "reis":
      return "رییس";
    default:
      return role ?? "—";
  }
}
