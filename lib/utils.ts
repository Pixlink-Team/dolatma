import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPersianNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}

export function formatPersianDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function formatPersianDateTime(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const secsStr = secs.toString().padStart(2, "0");
  return `${formatPersianNumber(mins)}:${secsStr}`;
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

export function adminHref(path: string, campaignId: string) {
  return `${path}?campaign=${campaignId}`;
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
    telegram: "تلگرام",
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

export function isSupabaseConfigured(): boolean {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") return false;
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co"
  );
}
