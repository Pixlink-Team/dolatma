import { extractAparatVideoHash } from "@/lib/media-utils";
import type { LinkMetricsPlatform } from "./types";

const MANUAL_ONLY_PLATFORMS = new Set([
  "instagram",
  "x",
  "telegram",
  "linkedin",
  "youtube",
  "bale",
  "soroush",
  "rubika",
]);

export function isEitaaUrl(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl.trim()).hostname.replace(/^www\./, "").toLowerCase();
    return host === "eitaa.com";
  } catch {
    return false;
  }
}

export function isAparatUrl(rawUrl: string): boolean {
  return extractAparatVideoHash(rawUrl) !== null;
}

export function isHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function detectBlockedMessengerHost(host: string): LinkMetricsPlatform | null {
  if (host.includes("bale.ai") || host.includes("ble.ir")) return "bale";
  if (host.includes("splus.ir") || host.includes("soroush")) return "soroush";
  if (host.includes("rubika.ir")) return "rubika";
  if (
    host.includes("instagram.com") ||
    host === "t.me" ||
    host.endsWith(".t.me") ||
    host.includes("telegram.") ||
    host.includes("youtube.com") ||
    host.includes("youtu.be") ||
    host.includes("linkedin.com") ||
    host === "x.com" ||
    host.includes("twitter.com")
  ) {
    return "unsupported";
  }
  return null;
}

export function detectLinkMetricsPlatform(
  url: string,
  declaredPlatform?: string | null
): LinkMetricsPlatform {
  if (isEitaaUrl(url) || declaredPlatform === "eitaa") return "eitaa";
  if (isAparatUrl(url) || declaredPlatform === "aparat") return "aparat";

  if (declaredPlatform === "bale") return "bale";
  if (declaredPlatform === "soroush") return "soroush";
  if (declaredPlatform === "rubika") return "rubika";

  try {
    const host = new URL(url.trim()).hostname.replace(/^www\./, "").toLowerCase();
    const blockedHost = detectBlockedMessengerHost(host);
    if (blockedHost) return blockedHost;
  } catch {
    // ignore invalid URL; handled by caller
  }

  if (declaredPlatform && MANUAL_ONLY_PLATFORMS.has(declaredPlatform)) {
    return "unsupported";
  }

  if (
    declaredPlatform === "site" ||
    declaredPlatform === "web" ||
    declaredPlatform === "magazine" ||
    declaredPlatform === "newspaper" ||
    isHttpUrl(url)
  ) {
    return "web";
  }

  return "unsupported";
}

const BLOCKED_REASONS: Record<"bale" | "soroush" | "rubika", string> = {
  bale: "بله API رسمی برای خواندن بازدید/لایک پست از لینک ندارد. مقدار را دستی وارد کنید.",
  soroush: "سروش API رسمی برای خواندن آمار پست از لینک ندارد. مقدار را دستی وارد کنید.",
  rubika: "روبیکا API رسمی برای خواندن آمار پست از لینک ندارد. مقدار را دستی وارد کنید.",
};

export function getLinkMetricsSupportMessage(platform: LinkMetricsPlatform): string {
  if (platform === "eitaa") {
    return "از لینک عمومی پست ایتا می‌توان بازدید، متن و کاور را خواند.";
  }
  if (platform === "aparat") {
    return "از لینک ویدیو آپارات می‌توان بازدید، لایک، کامنت، عنوان و کاور را خواند.";
  }
  if (platform === "web") {
    return "از لینک صفحه می‌توان عنوان، توضیح و تصویر شاخص (Open Graph) را خواند.";
  }
  if (platform === "unsupported") {
    return "برای این لینک واکشی خودکار پشتیبانی نمی‌شود.";
  }
  return BLOCKED_REASONS[platform];
}
