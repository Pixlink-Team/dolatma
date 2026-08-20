import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseISODateLocal } from "@/lib/jalali";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPersianNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}

const persianDateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const persianDateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});


const tehranHourMinuteFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const persianDateShortFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  month: "short",
  day: "numeric",
});

function toLocalDate(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const { y, m, d } = parseISODateLocal(dateStr);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

export function formatPersianDate(dateStr: string): string {
  if (!dateStr?.trim()) return "—";
  try {
    const date = toLocalDate(dateStr);
    if (!isValidDate(date)) return "—";
    return persianDateFormatter.format(date);
  } catch {
    return "—";
  }
}

export function formatPersianDateShort(dateStr: string): string {
  if (!dateStr?.trim()) return "—";
  try {
    const date = toLocalDate(dateStr);
    if (!isValidDate(date)) return "—";
    return persianDateShortFormatter.format(date);
  } catch {
    return "—";
  }
}

export function formatPersianDateTime(dateStr: string): string {
  if (!dateStr?.trim()) return "—";
  try {
    const date = toLocalDate(dateStr);
    if (!isValidDate(date)) return "—";
    return persianDateTimeFormatter.format(date);
  } catch {
    return "—";
  }
}


/** HH:mm clock in Asia/Tehran with Persian digits. */
export function formatTehranClock(iso: string): string {
  if (!iso?.trim()) return "-";
  const parsed = new Date(iso);
  if (!isValidDate(parsed)) return "-";
  return tehranHourMinuteFormatter
    .format(parsed)
    .replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const secsStr = secs.toString().padStart(2, "0");
  return `${formatPersianNumber(mins)}:${secsStr}`;
}

/** Human-readable Persian duration for online sessions / presence totals. */
export function formatPersianDurationFromSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";
  const seconds = Math.round(totalSeconds);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return hours > 0
      ? `${formatPersianNumber(days)} روز و ${formatPersianNumber(hours)} ساعت`
      : `${formatPersianNumber(days)} روز`;
  }
  if (hours > 0) {
    return minutes > 0
      ? `${formatPersianNumber(hours)} ساعت و ${formatPersianNumber(minutes)} دقیقه`
      : `${formatPersianNumber(hours)} ساعت`;
  }
  if (minutes > 0) return `${formatPersianNumber(minutes)} دقیقه`;
  return `${formatPersianNumber(Math.max(seconds, 1))} ثانیه`;
}

/** Human-readable Persian duration from total minutes (ticket reply SLA, etc.). */
export function formatPersianMinutesDuration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return "—";
  const total = Math.round(minutes);
  if (total < 1) return "کمتر از ۱ دقیقه";
  if (total < 60) return `${formatPersianNumber(total)} دقیقه`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours < 48) {
    return mins > 0
      ? `${formatPersianNumber(hours)} ساعت و ${formatPersianNumber(mins)} دقیقه`
      : `${formatPersianNumber(hours)} ساعت`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0
    ? `${formatPersianNumber(days)} روز و ${formatPersianNumber(remHours)} ساعت`
    : `${formatPersianNumber(days)} روز`;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || generateId().slice(0, 8);
}

export function adminHref(path: string, campaignId?: string | null) {
  const id = campaignId?.trim();
  if (!id) return path;
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}campaign=${id}`;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    live: "زنده",
    completed: "پایان‌یافته",
    draft: "پیش‌نویس",
    published: "منتشر شده",
    final: "نهایی",
    revised: "بازبینی شده",
    pending: "در انتظار",
    approved: "تأیید شده",
    rejected: "رد شده",
    instagram: "اینستاگرام",
    x: "ایکس (X)",
    telegram: "تلگرام",
    linkedin: "لینکدین",
    youtube: "یوتیوب",
    aparat: "آپارات",
    rubika: "روبیکا",
    eitaa: "ایتا",
    soroush: "سروش",
    bale: "بله",
    site: "سایت",
    image: "تصویر",
    text: "متن",
    video: "ویدیو",
    carousel: "کاروسل",
    story: "استوری",
    reel: "ریلز",
    audio: "صوتی",
    direct: "مستقیم",
    google: "گوگل",
    referral: "ارجاع",
    other: "سایر",
    mobile: "موبایل",
    desktop: "دسکتاپ",
    tablet: "تبلت",
  };
  return labels[status] ?? status;
}

export function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
  switch (status) {
    case "live":
    case "approved":
    case "published":
    case "final":
      return "success";
    case "completed":
      return "default";
    case "pending":
    case "draft":
    case "revised":
      return "warning";
    case "rejected":
      return "destructive";
    default:
      return "secondary";
  }
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return "—";
  if (phone.length <= 4) return "****";
  return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
}

export function maskEmail(email?: string | null): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return "****";
  return `${local.slice(0, 2)}****@${domain}`;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/** Mock data is for local demos only — never force it in production builds. */
function isMockDataForced(): boolean {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "true") return false;
  if (process.env.NODE_ENV === "production") {
    console.warn("[config] NEXT_PUBLIC_USE_MOCK_DATA is ignored in production");
    return false;
  }
  return true;
}

export function isPostgresConfigured(): boolean {
  if (isMockDataForced()) return false;
  return Boolean(process.env.DATABASE_URL);
}

export function isSupabaseConfigured(): boolean {
  if (isMockDataForced()) return false;
  if (isPostgresConfigured()) return false;
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co"
  );
}

export function getDatabaseMode(): "postgres" | "supabase" | "mock" {
  if (isPostgresConfigured()) return "postgres";
  if (isSupabaseConfigured()) return "supabase";
  return "mock";
}
