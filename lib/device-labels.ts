import type {
  DeviceActivityScope,
  DeviceCapacityType,
  DeviceOfficialRole,
  DeviceReadinessStatus,
  DeviceStatus,
  DeviceType,
} from "@/lib/types";

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  ministry: "وزارتخانه",
  organization: "سازمان",
  directorate: "اداره کل",
  company: "شرکت",
  governorate: "استانداری",
  municipality: "شهرداری",
  other: "سایر",
};

export const DEVICE_SCOPE_LABELS: Record<DeviceActivityScope, string> = {
  national: "ملی",
  provincial: "استانی",
  city: "شهری",
  regional: "منطقه‌ای",
};

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  active: "فعال",
  inactive: "غیرفعال",
  suspended: "موقتاً تعلیق‌شده",
};

export const DEVICE_OFFICIAL_ROLE_LABELS: Record<DeviceOfficialRole, string> = {
  primary: "مسئول اصلی",
  deputy: "جانشین مسئول",
  pr: "مسئول روابط عمومی",
  campaign_exec: "مسئول اجرای کمپین‌ها",
  supervisor: "ناظر / تأییدکننده",
};

export const DEVICE_CAPACITY_TYPE_LABELS: Record<DeviceCapacityType, string> = {
  branches: "شعب و واحدهای زیرمجموعه",
  website_app: "سایت و اپلیکیشن",
  social: "صفحات شبکه‌های اجتماعی",
  sms_panel: "پنل پیامک",
  billboards: "بیلبورد و سازه‌های تبلیغاتی",
  urban_tv: "تلویزیون شهری / نمایشگر",
  venues: "سالن، مدرسه یا فضای عمومی",
  pr_team: "تیم روابط عمومی",
  creative_team: "تیم طراحی، عکاسی و فیلم‌برداری",
  field_staff: "نیروی اجرایی و استانی",
  call_center: "مرکز تماس",
  contractors: "پیمانکاران و تأمین‌کنندگان",
  other: "سایر",
};

export const DEVICE_READINESS_LABELS: Record<DeviceReadinessStatus, string> = {
  ready: "آماده",
  needs_completion: "نیازمند تکمیل",
  high_risk: "پرریسک",
  inactive: "غیرفعال",
};
