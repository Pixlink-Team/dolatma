import type { ScoreableContentType } from "@/lib/types";

export type ContentMessageContentType = ScoreableContentType;
export type ContentMessageFollowUpStatus = "open" | "awaiting_user" | "user_replied" | "resolved";

export interface ContentMessage {
  id: string;
  campaignId: string;
  contentType: ContentMessageContentType;
  contentId: string;
  contentTitle: string;
  recipientUserId: string;
  senderUserId: string | null;
  senderName: string | null;
  senderRole: string | null;
  body: string;
  parentMessageId?: string | null;
  followUpStatus?: ContentMessageFollowUpStatus;
  seenAt: string | null;
  createdAt: string;
  replies?: ContentMessage[];
}

export interface SendContentMessageInput {
  campaignId: string;
  contentType: ContentMessageContentType;
  contentId: string;
  contentTitle?: string;
  body: string;
}

export const CONTENT_MESSAGE_ADMIN_PATHS: Record<ContentMessageContentType, string> = {
  billboard: "/admin/billboards",
  poster: "/admin/posters",
  video: "/admin/videos",
  file: "/admin/files",
  raw_media: "/admin/raw-media",
  social_post: "/admin/social-posts",
  site_publication: "/admin/site-publications",
  activity: "/admin/activities",
  broadcast: "/admin/broadcast",
  meeting: "/admin/meetings",
  text_content: "/admin/text-contents",
};

export const CONTENT_MESSAGE_TYPE_LABELS: Record<ContentMessageContentType, string> = {
  billboard: "تبلیغات محیطی",
  poster: "پوستر و عکس",
  video: "ویدیو",
  file: "فایل",
  raw_media: "راش تصاویر",
  social_post: "پست شبکه اجتماعی",
  site_publication: "سایت / خبرگزاری",
  activity: "اقدام",
  broadcast: "صدا و سیما",
  meeting: "جلسه",
  text_content: "خبر و متن",
};

export const CONTENT_MESSAGE_CONTENT_TYPES = Object.keys(
  CONTENT_MESSAGE_TYPE_LABELS
) as ContentMessageContentType[];

export function buildContentMessageAdminPath(
  contentType: ContentMessageContentType,
  campaignId: string,
  contentId: string
): string {
  const base = CONTENT_MESSAGE_ADMIN_PATHS[contentType];
  const params = new URLSearchParams({
    campaign: campaignId,
    edit: contentId,
  });
  return `${base}?${params.toString()}`;
}
