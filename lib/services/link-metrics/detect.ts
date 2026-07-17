import type { LinkMetricsPlatform } from "./types";

export function isEitaaUrl(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl.trim()).hostname.replace(/^www\./, "").toLowerCase();
    return host === "eitaa.com";
  } catch {
    return false;
  }
}

export function detectLinkMetricsPlatform(
  url: string,
  declaredPlatform?: string | null
): LinkMetricsPlatform {
  if (isEitaaUrl(url) || declaredPlatform === "eitaa") return "eitaa";
  if (declaredPlatform === "bale") return "bale";
  if (declaredPlatform === "soroush") return "soroush";
  if (declaredPlatform === "rubika") return "rubika";

  try {
    const host = new URL(url.trim()).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("bale.ai") || host.includes("ble.ir")) return "bale";
    if (host.includes("splus.ir") || host.includes("soroush")) return "soroush";
    if (host.includes("rubika.ir")) return "rubika";
  } catch {
    // ignore invalid URL; handled by caller
  }

  return "unsupported";
}

const UNSUPPORTED_REASONS: Record<Exclude<LinkMetricsPlatform, "eitaa" | "unsupported">, string> = {
  bale: "بله API رسمی برای خواندن بازدید/لایک پست از لینک ندارد. مقدار را دستی وارد کنید.",
  soroush: "سروش API رسمی برای خواندن آمار پست از لینک ندارد. مقدار را دستی وارد کنید.",
  rubika: "روبیکا API رسمی برای خواندن آمار پست از لینک ندارد. مقدار را دستی وارد کنید.",
};

export function getLinkMetricsSupportMessage(platform: LinkMetricsPlatform): string {
  if (platform === "eitaa") {
    return "از لینک عمومی پست ایتا می‌توان بازدید، متن و کاور را خواند.";
  }
  if (platform === "unsupported") {
    return "برای این لینک واکشی خودکار پشتیبانی نمی‌شود.";
  }
  return UNSUPPORTED_REASONS[platform];
}
