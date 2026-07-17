import { CONTENT_TITLE_MAX_LENGTH } from "@/lib/content-constraints";
import { extractAparatVideoHash } from "@/lib/media-utils";
import type { LinkMetricsResult } from "./types";

const APARAT_API =
  "https://www.aparat.com/api/fa/v1/video/video/show/videohash";
const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; DashboardInfoBot/1.0; +https://localhost)";

function asNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

function truncateTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= CONTENT_TITLE_MAX_LENGTH) return cleaned;
  return `${cleaned.slice(0, CONTENT_TITLE_MAX_LENGTH - 1).trimEnd()}…`;
}

function parsePublishedDate(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const isoLike = raw.trim().replace(" ", "T");
  const date = new Date(isoLike);
  if (Number.isNaN(date.getTime())) {
    const dayOnly = raw.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dayOnly)) return dayOnly;
    return null;
  }
  return date.toISOString().slice(0, 10);
}

export async function fetchAparatPostMetrics(rawUrl: string): Promise<LinkMetricsResult> {
  const hash = extractAparatVideoHash(rawUrl);
  if (!hash) {
    return {
      platform: "aparat",
      supported: true,
      error: "لینک ویدیو آپارات معتبر نیست. مثال: https://www.aparat.com/v/xxxxx",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${APARAT_API}/${encodeURIComponent(hash)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        "Accept-Language": "fa,en;q=0.8",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        platform: "aparat",
        supported: true,
        error: `دریافت اطلاعات آپارات ناموفق بود (HTTP ${response.status}).`,
      };
    }

    const json = (await response.json()) as {
      data?: {
        attributes?: Record<string, unknown>;
      };
      included?: Array<{
        type?: string;
        attributes?: Record<string, unknown>;
      }>;
    };

    const attrs = json.data?.attributes;
    if (!attrs) {
      return {
        platform: "aparat",
        supported: true,
        error: "ویدیو در آپارات پیدا نشد.",
      };
    }

    const likeFromIncluded = json.included?.find((item) => item.type === "Like")
      ?.attributes?.cnt;

    const titleRaw = typeof attrs.title === "string" ? attrs.title : null;
    const description =
      typeof attrs.description === "string" ? attrs.description.trim() : null;
    const coverImageUrl =
      (typeof attrs.big_poster === "string" && attrs.big_poster) ||
      (typeof attrs.medium_poster === "string" && attrs.medium_poster) ||
      (typeof attrs.small_poster === "string" && attrs.small_poster) ||
      null;

    return {
      platform: "aparat",
      supported: true,
      views: asNumber(attrs.visit_cnt_non_formatted ?? attrs.visit_cnt),
      likes: asNumber(attrs.like_cnt_non_formatted ?? likeFromIncluded),
      comments: asNumber(attrs.comment_cnt_non_formatted ?? attrs.comment_cnt),
      title: titleRaw ? truncateTitle(titleRaw) : null,
      description: description || null,
      coverImageUrl,
      publishedDate: parsePublishedDate(attrs.sdate_real ?? attrs.mdate),
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      platform: "aparat",
      supported: true,
      error: aborted
        ? "دریافت اطلاعات آپارات طولانی شد. دوباره تلاش کنید."
        : "دریافت اطلاعات آپارات ناموفق بود.",
    };
  } finally {
    clearTimeout(timer);
  }
}
