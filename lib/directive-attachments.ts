import type { CampaignDirective, DirectiveAttachment } from "@/lib/types";
import { stripFileAccessToken } from "@/lib/uploads";

/** Action attachments only — excludes legacy rows that mirror the official letter. */
export function getDirectiveActionAttachments(item: CampaignDirective): DirectiveAttachment[] {
  const letterUrl = stripFileAccessToken(item.letterFileUrl ?? "");
  return (item.attachments ?? [])
    .filter((attachment) => {
      const title = (attachment.title ?? "").trim();
      const attachmentUrl = stripFileAccessToken(attachment.fileUrl ?? "");
      if (!attachmentUrl) return false;
      if (!letterUrl) return title !== "نامه رسمی";
      return attachmentUrl !== letterUrl;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
