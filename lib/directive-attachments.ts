import type { CampaignDirective, DirectiveAttachment } from "@/lib/types";

/** Action attachments only — excludes legacy rows that mirror the official letter. */
export function getDirectiveActionAttachments(item: CampaignDirective): DirectiveAttachment[] {
  const letterUrl = item.letterFileUrl ?? "";
  return (item.attachments ?? [])
    .filter((attachment) => {
      if (!letterUrl) return attachment.title.trim() !== "نامه رسمی";
      return attachment.fileUrl !== letterUrl;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
