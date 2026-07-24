import type {
  ActionStatus,
  ActionType,
  ArchiveType,
  CaseCreatedByType,
  CaseStatus,
  IngestionType,
  KeywordType,
  MediaSourceType,
  MonitoringRole,
  MonitoredItemStatus,
  NotificationChannel,
  OrganizationType,
  ResponseType,
  ReviewStatus,
  RiskLevel,
  Sentiment,
  TrendStatus,
  TrendType,
  UrgencyLevel,
} from "@/lib/monitoring/types";

export const MONITORING_NAV = [
  { href: "/admin/monitoring/dashboard", label: "داشبورد رصد", exact: true },
  { href: "/admin/monitoring/feed", label: "جریان رصد" },
  { href: "/admin/monitoring/items/new", label: "ثبت خبر منفی" },
  { href: "/admin/monitoring/trends", label: "ترندها" },
  { href: "/admin/rapid-response/cases", label: "واکنش سریع" },
  { href: "/admin/monitoring/archive", label: "بانک خبر و تحلیل" },
  { href: "/admin/monitoring/settings", label: "تنظیمات رصد" },
] as const;

export const KEYWORD_TYPE_LABELS: Record<KeywordType, string> = {
  organization: "سازمان",
  manager: "مدیر",
  project: "پروژه",
  service: "خدمت",
  sensitive_topic: "موضوع حساس",
  hashtag: "هشتگ",
  location: "مکان",
  custom: "سفارشی",
};

export const SOURCE_TYPE_LABELS: Record<MediaSourceType, string> = {
  news_agency: "خبرگزاری",
  website: "وب‌سایت",
  newspaper: "روزنامه",
  instagram_page: "صفحه اینستاگرام",
  telegram_channel: "کانال تلگرام",
  x_account: "حساب ایکس",
  influencer: "اینفلوئنسر",
  journalist: "خبرنگار",
  official_account: "حساب رسمی",
  other: "سایر",
};

export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: "مثبت",
  neutral: "خنثی",
  negative: "منفی",
  mixed: "ترکیبی",
};

export const ITEM_STATUS_LABELS: Record<MonitoredItemStatus, string> = {
  new: "جدید",
  under_review: "در حال بررسی",
  verified: "تأییدشده",
  irrelevant: "نامرتبط",
  duplicate: "تکراری",
  monitoring: "در حال رصد",
  converted_to_case: "تبدیل‌شده به پرونده",
  archived: "آرشیو شده",
  closed: "بسته‌شده",
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "در انتظار",
  approved: "تأییدشده",
  rejected: "ردشده",
  needs_more_information: "نیازمند اطلاعات بیشتر",
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  low: "کم",
  normal: "عادی",
  high: "بالا",
  critical: "بحرانی",
  immediate: "فوری",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "کم",
  medium: "متوسط",
  high: "بالا",
  critical: "بحرانی",
};

export const TREND_TYPE_LABELS: Record<TrendType, string> = {
  emerging: "نوظهور",
  growing: "در حال رشد",
  stable: "پایدار",
  declining: "رو به کاهش",
  viral: "وایرال",
};

export const TREND_STATUS_LABELS: Record<TrendStatus, string> = {
  active: "فعال",
  under_review: "در حال بررسی",
  converted_to_case: "تبدیل‌شده به پرونده",
  archived: "آرشیو",
  closed: "بسته",
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  draft: "پیش‌نویس",
  awaiting_review: "در انتظار بررسی",
  open: "باز",
  assigned: "تخصیص‌یافته",
  action_required: "نیازمند اقدام",
  content_in_production: "در حال تولید محتوا",
  awaiting_approval: "در انتظار تأیید",
  publishing: "در حال انتشار",
  impact_monitoring: "سنجش اثر",
  resolved: "حل‌شده",
  closed: "بسته‌شده",
  rejected: "ردشده",
  overdue: "تأخیرخورده",
};

export const RESPONSE_TYPE_LABELS: Record<ResponseType, string> = {
  official_response: "پاسخ رسمی",
  clarification: "روشنگری",
  denial: "تکذیب",
  expert_explanation: "توضیح کارشناسی",
  visual_content: "محتوای تصویری",
  video_content: "محتوای ویدئویی",
  interview: "مصاحبه",
  viral_distribution: "توزیع گسترده",
  legal_response: "پاسخ حقوقی",
  monitor_only: "فقط رصد",
  combined: "ترکیبی",
};

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  research: "تحقیق",
  prepare_response: "آماده‌سازی پاسخ",
  create_text: "تولید متن",
  create_image: "تولید تصویر",
  create_video: "تولید ویدئو",
  official_statement: "بیانیه رسمی",
  publish: "انتشار",
  republish: "بازنشر",
  influencer_distribution: "توزیع اینفلوئنسری",
  media_outreach: "ارتباط رسانه‌ای",
  legal_review: "بررسی حقوقی",
  management_approval: "تأیید مدیریتی",
  monitor_result: "رصد نتیجه",
  other: "سایر",
};

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  pending: "در انتظار",
  assigned: "تخصیص‌یافته",
  in_progress: "در حال انجام",
  awaiting_approval: "در انتظار تأیید",
  completed: "انجام‌شده",
  rejected: "ردشده",
  overdue: "تأخیرخورده",
  cancelled: "لغوشده",
};

export const CREATED_BY_TYPE_LABELS: Record<CaseCreatedByType, string> = {
  monitoring_team: "تیم رصد",
  automatic_system: "سیستم خودکار",
  organization: "سازمان",
  central_command: "مرکز فرمان",
};

export const INGESTION_LABELS: Record<IngestionType, string> = {
  manual: "دستی",
  automatic: "خودکار",
};

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: "درون‌سامانه",
  sms: "پیامک",
  email: "ایمیل",
  push: "پوش",
};

export const ARCHIVE_TYPE_LABELS: Record<ArchiveType, string> = {
  negative_news: "خبر منفی",
  trend: "ترند",
  rapid_response_case: "پرونده واکنش سریع",
  lesson: "درس‌آموخته",
  source_profile: "رسانه اثرگذار",
};

export const ORG_TYPE_LABELS: Record<OrganizationType, string> = {
  ministry: "وزارتخانه",
  organization: "سازمان",
  agency: "دستگاه",
  provincial: "استانی",
  municipal: "شهری",
  other: "سایر",
};

export const MONITORING_ROLE_LABELS: Record<MonitoringRole, string> = {
  super_admin: "مدیر کل سامانه",
  central_command_manager: "مدیر مرکز فرمان",
  monitoring_manager: "مدیر رصد",
  monitoring_operator: "کارشناس رصد",
  organization_manager: "مدیر سازمان",
  public_relations_manager: "مدیر روابط عمومی",
  shift_officer: "مسئول شیفت",
  content_manager: "مدیر محتوا",
  analyst: "تحلیل‌گر",
  viewer: "مشاهده‌گر",
};

export const PLATFORM_LABELS: Record<string, string> = {
  instagram: "اینستاگرام",
  telegram: "تلگرام",
  x: "ایکس",
  news: "خبرگزاری",
  website: "وب‌سایت",
  youtube: "یوتیوب",
  aparat: "آپارات",
  other: "سایر",
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: "bg-emerald-50 text-emerald-800 border-emerald-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  high: "bg-orange-100 text-orange-900 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  normal: "bg-sky-50 text-sky-800 border-sky-200",
  high: "bg-orange-100 text-orange-900 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
  immediate: "bg-red-200 text-red-950 border-red-300",
};

export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  awaiting_review: "bg-amber-100 text-amber-800",
  open: "bg-sky-100 text-sky-800",
  assigned: "bg-blue-100 text-blue-800",
  action_required: "bg-orange-100 text-orange-900",
  content_in_production: "bg-violet-100 text-violet-800",
  awaiting_approval: "bg-yellow-100 text-yellow-900",
  publishing: "bg-cyan-100 text-cyan-900",
  impact_monitoring: "bg-teal-100 text-teal-900",
  resolved: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-200 text-slate-600",
  rejected: "bg-stone-100 text-stone-600",
  overdue: "bg-red-100 text-red-800",
};
