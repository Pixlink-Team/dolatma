import type { SocialMediaPost, SocialPlatform, SocialPostLinkEntry } from "@/lib/types";
import { ensureHttpUrl } from "@/lib/url";

export const MAX_SOCIAL_POST_LINK_ENTRIES = 200;

export const SOCIAL_PLATFORM_OPTIONS: SocialPlatform[] = [
  "instagram",
  "x",
  "telegram",
  "linkedin",
  "youtube",
  "aparat",
  "rubika",
  "eitaa",
  "soroush",
  "bale",
  "other",
];

const SOCIAL_PLATFORM_SET = new Set<string>(SOCIAL_PLATFORM_OPTIONS);

export function isSocialPlatform(value: unknown): value is SocialPlatform {
  return typeof value === "string" && SOCIAL_PLATFORM_SET.has(value);
}

export function isSitePublication(post: Pick<SocialMediaPost, "platform">): boolean {
  return post.platform === "site";
}

export function isNewsAgencyPublication(post: Pick<SocialMediaPost, "platform">): boolean {
  return post.platform === "news_agency";
}

/** Site or news-agency publications (not social network posts). */
export function isWebOutletPublication(post: Pick<SocialMediaPost, "platform">): boolean {
  return isSitePublication(post) || isNewsAgencyPublication(post);
}

export function splitSocialPosts(posts: SocialMediaPost[]) {
  const sitePublications = posts.filter(isSitePublication);
  const newsAgencyPublications = posts.filter(isNewsAgencyPublication);
  const socialPosts = posts.filter((post) => !isWebOutletPublication(post));
  return { sitePublications, newsAgencyPublications, socialPosts };
}

/** True when the post is distributed across multiple links (group distribution). */
export function isGroupSocialPost(
  post: Pick<SocialMediaPost, "linkEntries"> | { linkEntries?: SocialPostLinkEntry[] | null }
): boolean {
  return (post.linkEntries?.length ?? 0) > 0;
}

function parseNonNegativeInt(value: unknown): number {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

export function createEmptySocialPostLinkEntry(platform?: SocialPlatform): SocialPostLinkEntry {
  return {
    id: crypto.randomUUID(),
    link: "",
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    ...(platform ? { platform } : {}),
  };
}

export function parseSocialPostLinkEntries(value: unknown): SocialPostLinkEntry[] {
  const raw =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return [];
          }
        })()
      : value;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const rawLink = typeof record.link === "string" ? record.link.trim() : "";
      const link = ensureHttpUrl(rawLink) ?? rawLink;
      const id = typeof record.id === "string" && record.id ? record.id : crypto.randomUUID();
      if (!link) return null;
      const platform = isSocialPlatform(record.platform) ? record.platform : undefined;
      return {
        id,
        link,
        views: parseNonNegativeInt(record.views),
        likes: parseNonNegativeInt(record.likes),
        comments: parseNonNegativeInt(record.comments),
        shares: parseNonNegativeInt(record.shares),
        ...(platform ? { platform } : {}),
      };
    })
    .filter((item): item is SocialPostLinkEntry => Boolean(item))
    .slice(0, MAX_SOCIAL_POST_LINK_ENTRIES);
}

export function normalizeSocialPostLinkEntries(
  entries: SocialPostLinkEntry[] | null | undefined
): SocialPostLinkEntry[] {
  return parseSocialPostLinkEntries(entries ?? []);
}

export function sumSocialPostLinkEntryViews(entries: SocialPostLinkEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.views ?? 0), 0);
}

export function sumSocialPostLinkEntryLikes(entries: SocialPostLinkEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.likes ?? 0), 0);
}

export function sumSocialPostLinkEntryComments(entries: SocialPostLinkEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.comments ?? 0), 0);
}

export function sumSocialPostLinkEntryShares(entries: SocialPostLinkEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.shares ?? 0), 0);
}

/** Unique platforms present on link entries, in first-seen order. */
export function getSocialPostLinkEntryPlatforms(
  entries: SocialPostLinkEntry[] | null | undefined
): SocialPlatform[] {
  const seen = new Set<SocialPlatform>();
  const result: SocialPlatform[] = [];
  for (const entry of entries ?? []) {
    if (!entry.platform || seen.has(entry.platform)) continue;
    seen.add(entry.platform);
    result.push(entry.platform);
  }
  return result;
}
