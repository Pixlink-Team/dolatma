import { CONTENT_TITLE_MAX_LENGTH } from "@/lib/content-constraints";
import type { LinkMetricsResult, ParsedEitaaPostUrl } from "./types";

const EITAA_ORIGIN = "https://eitaa.com";
const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; DashboardInfoBot/1.0; +https://localhost)";

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\u200c/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function absolutizeEitaaUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith("/")) {
    return `${EITAA_ORIGIN}${trimmed}`;
  }
  return `${EITAA_ORIGIN}/${trimmed}`;
}

function truncateTitle(text: string): string {
  const firstLine = text.split(/\n+/).map((line) => line.trim()).find(Boolean) ?? text;
  if (firstLine.length <= CONTENT_TITLE_MAX_LENGTH) return firstLine;
  return `${firstLine.slice(0, CONTENT_TITLE_MAX_LENGTH - 1).trimEnd()}…`;
}

function extractMessageBlock(html: string, messageId: number): string | null {
  const idAttr = `id="${messageId}"`;
  const start = html.indexOf(idAttr);
  if (start === -1) return null;

  const wrapStart = html.lastIndexOf("<div", start);
  if (wrapStart === -1) return null;

  const nextWrap = html.indexOf('class="etme_widget_message_wrap', start + idAttr.length);
  const end = nextWrap === -1 ? html.length : nextWrap;
  return html.slice(wrapStart, end);
}

function parseViews(block: string): number | undefined {
  const match = block.match(
    /class=["'][^"']*etme_widget_message_views[^"']*["'][^>]*data-count=["'](\d+)["']/i
  ) ?? block.match(
    /data-count=["'](\d+)["'][^>]*class=["'][^"']*etme_widget_message_views[^"']*["']/i
  );
  if (!match) return undefined;
  const views = Number(match[1]);
  return Number.isFinite(views) ? views : undefined;
}

function parseText(block: string): string | null {
  const match = block.match(
    /class=["'][^"']*etme_widget_message_text[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  );
  if (!match) return null;
  const text = stripHtml(match[1]);
  return text || null;
}

function parseCoverImage(block: string): string | null {
  const styleMatch = block.match(
    /class=["'][^"']*etme_widget_message_photo_wrap[^"']*["'][^>]*style=["'][^"']*background-image:\s*url\(([^)]+)\)/i
  );
  if (styleMatch?.[1]) {
    return absolutizeEitaaUrl(styleMatch[1]);
  }

  const videoThumb = block.match(
    /class=["'][^"']*etme_widget_message_video_thumb[^"']*["'][^>]*style=["'][^"']*background-image:\s*url\(([^)]+)\)/i
  );
  if (videoThumb?.[1]) {
    return absolutizeEitaaUrl(videoThumb[1]);
  }

  return null;
}

function parsePublishedDate(block: string): string | null {
  const match = block.match(/datetime=["']([^"']+)["']/i);
  if (!match?.[1]) return null;
  const date = new Date(match[1]);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parseChannelTitle(html: string): string | null {
  const og = html.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i)
    ?? html.match(/content=["']([^"']+)["']\s+property=["']og:title["']/i);
  if (og?.[1]) {
    const cleaned = stripHtml(og[1]).replace(/\s*[-|].*$/, "").trim();
    return cleaned || null;
  }
  return null;
}

function parseSubscribers(html: string): number | null {
  const match = html.match(
    /class=["'][^"']*counter_value[^"']*["'][^>]*data-count=["'](\d+)["']/i
  );
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function parseEitaaPostUrl(rawUrl: string): ParsedEitaaPostUrl | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "eitaa.com") return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  // https://eitaa.com/s/{channel}/{messageId}
  if (parts[0] === "s" && parts.length >= 3) {
    const messageId = Number(parts[2]);
    if (!parts[1] || !Number.isFinite(messageId) || messageId <= 0) return null;
    return { channelId: parts[1], messageId };
  }

  // https://eitaa.com/{channel}/{messageId}
  if (parts.length >= 2 && /^\d+$/.test(parts[1])) {
    const messageId = Number(parts[1]);
    if (!parts[0] || !Number.isFinite(messageId) || messageId <= 0) return null;
    return { channelId: parts[0], messageId };
  }

  // Channel-only URL is not enough for a specific post.
  return null;
}

async function fetchEitaaHtml(url: string): Promise<string> {
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
      throw new Error(`Eitaa responded with HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchEitaaPostMetrics(rawUrl: string): Promise<LinkMetricsResult> {
  const parsed = parseEitaaPostUrl(rawUrl);
  if (!parsed) {
    return {
      platform: "eitaa",
      supported: true,
      error: "لینک پست ایتا معتبر نیست. مثال: https://eitaa.com/s/channel/123",
    };
  }

  const { channelId, messageId } = parsed;
  // Public preview loads messages before a cursor; messageId+1 brings the target into the page.
  const pageUrl = `${EITAA_ORIGIN}/${encodeURIComponent(channelId)}?before=${messageId + 1}`;

  let html: string;
  try {
    html = await fetchEitaaHtml(pageUrl);
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      platform: "eitaa",
      supported: true,
      error: aborted
        ? "دریافت اطلاعات ایتا طولانی شد. دوباره تلاش کنید."
        : "دریافت صفحه ایتا ناموفق بود. کانال باید عمومی باشد.",
    };
  }

  const block = extractMessageBlock(html, messageId);
  if (!block) {
    return {
      platform: "eitaa",
      supported: true,
      error: "پست در صفحه عمومی ایتا پیدا نشد. لینک یا عمومی بودن کانال را بررسی کنید.",
    };
  }

  const text = parseText(block);
  const channelTitle = parseChannelTitle(html);
  const title = text ? truncateTitle(text) : channelTitle;

  return {
    platform: "eitaa",
    supported: true,
    views: parseViews(block),
    title: title ?? null,
    description: text,
    coverImageUrl: parseCoverImage(block),
    publishedDate: parsePublishedDate(block),
    subscribers: parseSubscribers(html),
  };
}

export async function fetchEitaaChannelMetrics(rawUrl: string): Promise<LinkMetricsResult> {
  let channelId: string | null = null;
  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "eitaa.com") {
      return { platform: "eitaa", supported: true, error: "لینک کانال ایتا معتبر نیست." };
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "s" && parts[1]) channelId = parts[1];
    else if (parts[0]) channelId = parts[0];
  } catch {
    return { platform: "eitaa", supported: true, error: "لینک کانال ایتا معتبر نیست." };
  }

  if (!channelId) {
    return { platform: "eitaa", supported: true, error: "لینک کانال ایتا معتبر نیست." };
  }

  try {
    const html = await fetchEitaaHtml(`${EITAA_ORIGIN}/${encodeURIComponent(channelId)}`);
    return {
      platform: "eitaa",
      supported: true,
      title: parseChannelTitle(html),
      subscribers: parseSubscribers(html),
    };
  } catch {
    return {
      platform: "eitaa",
      supported: true,
      error: "دریافت اطلاعات کانال ایتا ناموفق بود.",
    };
  }
}
