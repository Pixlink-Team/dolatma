import { CONTENT_TITLE_MAX_LENGTH } from "@/lib/content-constraints";
import type { LinkMetricsResult } from "./types";

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; DashboardInfoBot/1.0; +https://localhost)";
const MAX_HTML_CHARS = 500_000;

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const num = Number(code);
      return Number.isFinite(num) ? String.fromCharCode(num) : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

function truncateTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= CONTENT_TITLE_MAX_LENGTH) return cleaned;
  return `${cleaned.slice(0, CONTENT_TITLE_MAX_LENGTH - 1).trimEnd()}…`;
}

function readMetaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]*>`,
        "i"
      ),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        const value = decodeHtmlEntities(match[1]);
        if (value) return value;
      }
    }
  }
  return null;
}

function readTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return null;
  const value = stripHtml(match[1]);
  return value || null;
}

function absolutizeUrl(raw: string, pageUrl: string): string | null {
  try {
    return new URL(raw, pageUrl).toString();
  } catch {
    return null;
  }
}

function parsePublishedDate(raw: string | null): string | null {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

async function fetchPageHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": USER_AGENT,
        "Accept-Language": "fa,en;q=0.8",
      },
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml") &&
      !contentType.includes("text/plain")
    ) {
      throw new Error("Not an HTML page");
    }

    const html = await response.text();
    return html.length > MAX_HTML_CHARS ? html.slice(0, MAX_HTML_CHARS) : html;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWebPageMetrics(rawUrl: string): Promise<LinkMetricsResult> {
  let pageUrl: string;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        platform: "web",
        supported: true,
        error: "فقط لینک‌های http/https پشتیبانی می‌شوند.",
      };
    }
    pageUrl = parsed.toString();
  } catch {
    return {
      platform: "web",
      supported: true,
      error: "لینک معتبر نیست.",
    };
  }

  let html: string;
  try {
    html = await fetchPageHtml(pageUrl);
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      platform: "web",
      supported: true,
      error: aborted
        ? "دریافت صفحه طولانی شد. دوباره تلاش کنید."
        : "دریافت محتوا از لینک ناموفق بود. صفحه باید عمومی باشد.",
    };
  }

  const ogTitle =
    readMetaContent(html, ["og:title", "twitter:title"]) ?? readTitleTag(html);
  const ogDescription = readMetaContent(html, [
    "og:description",
    "twitter:description",
    "description",
  ]);
  const ogImageRaw = readMetaContent(html, ["og:image", "twitter:image", "twitter:image:src"]);
  const publishedRaw = readMetaContent(html, [
    "article:published_time",
    "og:article:published_time",
    "publish_date",
    "date",
    "DC.date.issued",
  ]);

  const title = ogTitle ? truncateTitle(ogTitle) : null;
  const description = ogDescription ? decodeHtmlEntities(ogDescription) : null;
  const coverImageUrl = ogImageRaw ? absolutizeUrl(ogImageRaw, pageUrl) : null;
  const publishedDate = parsePublishedDate(publishedRaw);

  if (!title && !description && !coverImageUrl) {
    return {
      platform: "web",
      supported: true,
      error: "از این صفحه عنوان/توضیح/تصویر قابل خواندن پیدا نشد.",
    };
  }

  return {
    platform: "web",
    supported: true,
    title,
    description,
    coverImageUrl,
    publishedDate,
  };
}
