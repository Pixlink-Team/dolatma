"use client";

import { cn } from "@/lib/utils";
import {
  MEDIA_CONTENT_STATUS_COLORS,
  MEDIA_CONTENT_STATUS_LABELS,
  MEDIA_PUBLISH_MODE_COLORS,
  MEDIA_PUBLISH_MODE_LABELS,
  MEDIA_ACCOUNT_STATUS_LABELS,
} from "@/lib/media-command/labels";
import type {
  MediaAccountStatus,
  MediaContentStatus,
  MediaPublishMode,
} from "@/lib/media-command/types";

export function MediaContentStatusBadge({ status }: { status: MediaContentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
        MEDIA_CONTENT_STATUS_COLORS[status]
      )}
    >
      {MEDIA_CONTENT_STATUS_LABELS[status]}
    </span>
  );
}

export function MediaPublishModeBadge({ mode }: { mode: MediaPublishMode }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        MEDIA_PUBLISH_MODE_COLORS[mode]
      )}
    >
      {MEDIA_PUBLISH_MODE_LABELS[mode]}
    </span>
  );
}

export function MediaAccountStatusBadge({ status }: { status: MediaAccountStatus }) {
  const tone =
    status === "connected"
      ? "bg-green-100 text-green-800"
      : status === "disabled" || status === "pending_approval"
        ? "bg-slate-100 text-slate-700"
        : "bg-red-100 text-red-800";
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", tone)}>
      {MEDIA_ACCOUNT_STATUS_LABELS[status]}
    </span>
  );
}
