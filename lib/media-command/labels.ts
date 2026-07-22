import type {
  MediaAccountPermission,
  MediaAccountStatus,
  MediaContentStatus,
  MediaInteractionStatus,
  MediaLibraryCategory,
  MediaPublishMode,
  MediaPublishOrderMode,
  MediaPublishOrderStatus,
} from "@/lib/media-command/types";

export const MEDIA_ACCOUNT_STATUS_LABELS: Record<MediaAccountStatus, string> = {
  connected: "متصل",
  needs_reconnect: "نیازمند اتصال مجدد",
  token_expired: "توکن منقضی‌شده",
  access_error: "خطای دسترسی",
  disabled: "غیرفعال",
  pending_approval: "در انتظار تأیید",
};

export const MEDIA_ACCOUNT_PERMISSION_LABELS: Record<MediaAccountPermission, string> = {
  view_stats: "فقط مشاهده آمار",
  create_draft: "ساخت پیش‌نویس",
  publish: "انتشار محتوا",
  schedule: "زمان‌بندی انتشار",
  manage_comments: "مدیریت کامنت",
  reply: "پاسخ‌گویی",
  approve_content: "تأیید محتوا",
  receive_central: "دریافت انتشار مرکزی",
  direct_central_publish: "انتشار مستقیم مرکزی",
};

export const MEDIA_CONTENT_STATUS_LABELS: Record<MediaContentStatus, string> = {
  draft: "پیش‌نویس",
  pending_review: "در انتظار بررسی",
  needs_revision: "نیازمند اصلاح",
  approved: "تأییدشده",
  scheduled: "زمان‌بندی‌شده",
  publishing: "در حال انتشار",
  published: "منتشرشده",
  partial_publish: "انتشار ناقص",
  publish_error: "خطای انتشار",
  cancelled: "لغوشده",
  expired: "منقضی‌شده",
};

/** Tailwind classes for calendar/status chips */
export const MEDIA_CONTENT_STATUS_COLORS: Record<MediaContentStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  pending_review: "bg-amber-100 text-amber-800 border-amber-200",
  needs_revision: "bg-orange-100 text-orange-800 border-orange-200",
  approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  scheduled: "bg-sky-100 text-sky-800 border-sky-200",
  publishing: "bg-blue-100 text-blue-800 border-blue-200",
  published: "bg-green-100 text-green-800 border-green-200",
  partial_publish: "bg-yellow-100 text-yellow-900 border-yellow-200",
  publish_error: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  expired: "bg-stone-100 text-stone-600 border-stone-200",
};

export const MEDIA_PUBLISH_MODE_LABELS: Record<MediaPublishMode, string> = {
  normal: "عادی",
  central: "مرکزی",
  urgent: "فوری",
  crisis: "بحران",
};

export const MEDIA_PUBLISH_MODE_COLORS: Record<MediaPublishMode, string> = {
  normal: "bg-slate-100 text-slate-700",
  central: "bg-violet-100 text-violet-800",
  urgent: "bg-orange-100 text-orange-800",
  crisis: "bg-orange-200 text-orange-900",
};

export const MEDIA_ORDER_MODE_LABELS: Record<MediaPublishOrderMode, string> = {
  direct_central: "انتشار مستقیم مرکزی",
  local_approval: "انتشار با تأیید محلی",
  publish_pack: "بسته انتشار",
  content_mission: "مأموریت محتوایی",
};

export const MEDIA_ORDER_STATUS_LABELS: Record<MediaPublishOrderStatus, string> = {
  draft: "پیش‌نویس",
  sent: "ارسال‌شده",
  in_progress: "در حال اجرا",
  completed: "انجام‌شده",
  expired: "منقضی‌شده",
  cancelled: "لغوشده",
};

export const MEDIA_INTERACTION_STATUS_LABELS: Record<MediaInteractionStatus, string> = {
  new: "جدید",
  seen: "مشاهده‌شده",
  assigned: "تخصیص‌داده‌شده",
  reviewing: "در حال بررسی",
  suggested_reply_ready: "پاسخ پیشنهادی آماده",
  replied: "پاسخ‌داده‌شده",
  escalated: "ارجاع‌شده",
  closed: "بسته‌شده",
  needs_official_reply: "نیازمند پاسخ رسمی",
  media_crisis: "بحران رسانه‌ای",
};

export const MEDIA_LIBRARY_CATEGORY_LABELS: Record<MediaLibraryCategory, string> = {
  approved_messages: "پیام‌های مصوب",
  official_images: "تصاویر رسمی",
  videos: "ویدیوها",
  design_templates: "قالب‌های طراحی",
  logos: "لوگوها",
  citable_stats: "آمار قابل استناد",
  faq: "FAQ",
  official_replies: "پاسخ‌های رسمی",
  occasional: "محتوای مناسبتی",
  campaign_packs: "بسته‌های کمپین",
  past_success: "محتواهای موفق گذشته",
  local_content: "محتوای بومی دستگاه‌ها",
  publishable_files: "فایل‌های قابل انتشار",
};

export const MEDIA_COMMAND_NAV = [
  { href: "/admin/media-command", label: "پیشخوان رسانه", exact: true },
  { href: "/admin/media-command/publish", label: "انتشار محتوا" },
  { href: "/admin/media-command/calendar", label: "تقویم انتشار" },
  { href: "/admin/media-command/contents", label: "محتواها" },
  { href: "/admin/media-command/orders", label: "دستورهای انتشار" },
  { href: "/admin/media-command/inbox", label: "صندوق تعاملات" },
  { href: "/admin/media-command/smart-reply", label: "پاسخ هوشمند" },
  { href: "/admin/media-command/accounts", label: "حساب‌های متصل" },
  { href: "/admin/media-command/analytics", label: "تحلیل عملکرد" },
  { href: "/admin/media-command/library", label: "کتابخانه محتوا" },
  { href: "/admin/media-command/settings", label: "تنظیمات و دسترسی‌ها" },
] as const;
