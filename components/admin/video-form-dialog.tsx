"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminVideoEditor } from "@/components/admin/admin-video-editor";
import type { ContentTopic } from "@/lib/content-topics";
import { todayISO } from "@/lib/jalali";
import { pickDefaultVideoCategoryId } from "@/lib/video-types";
import { stripFileAccessToken } from "@/lib/uploads";
import type { MediaCategory, Video, VideoVersion } from "@/lib/types";

export interface VideoFormInitialValues {
  title?: string;
  description?: string;
  /** Cover/thumbnail from package images folder (video file still needed). */
  thumbnailUrl?: string;
  notes?: string;
  date?: string;
}

interface VideoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  ownerUserId?: string | null;
  categories: MediaCategory[];
  contentPlans?: string[];
  contentTopics?: ContentTopic[];
  initialValues?: VideoFormInitialValues | null;
  initialValuesKey?: string | null;
  queueLabel?: string;
  onSaved?: () => void;
  onSkip?: () => void;
  bulkTypeSwitcher?: ReactNode;
}

const editorDialogClass =
  "!flex min-h-0 max-h-[92vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 !top-4 !translate-x-[-50%] !translate-y-0 sm:!top-6";

export function VideoFormDialog({
  open,
  onOpenChange,
  campaignId,
  ownerUserId = null,
  categories,
  contentPlans = [],
  contentTopics = [],
  initialValues = null,
  initialValuesKey = null,
  queueLabel,
  onSaved,
  onSkip,
  bulkTypeSwitcher,
}: VideoFormDialogProps) {
  const [videoId, setVideoId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!open) return;
    setVideoId(crypto.randomUUID());
  }, [open, initialValuesKey]);

  const thumbnailUrl = stripFileAccessToken(initialValues?.thumbnailUrl?.trim() || "");
  const now = new Date().toISOString();

  const video: Video = useMemo(
    () => ({
      id: videoId,
      campaignId,
      categoryId: pickDefaultVideoCategoryId(categories),
      title: initialValues?.title?.trim() || "ویدیو جدید",
      description: initialValues?.description?.trim() || "",
      published: true,
      sortOrder: 1,
      planLabel: null,
      ownerUserId: ownerUserId || null,
      createdAt: now,
      updatedAt: now,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount identity via videoId
    [videoId, campaignId, categories, initialValues, ownerUserId]
  );

  const versions: VideoVersion[] = useMemo(() => {
    if (!thumbnailUrl) return [];
    // Prefill cover only — user still uploads the video file in the editor.
    return [
      {
        id: crypto.randomUUID(),
        videoId,
        versionNumber: 1,
        videoUrl: "",
        thumbnailUrl,
        notes: initialValues?.notes?.trim() || null,
        status: "draft",
        isFinal: false,
        date: initialValues?.date || todayISO(),
        createdAt: now,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount identity via videoId
  }, [thumbnailUrl, videoId, initialValues]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={editorDialogClass}>
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle>ویدیو جدید</DialogTitle>
          <DialogDescription>
            {queueLabel ? `${queueLabel} — ` : ""}
            عنوان از Excel پر شده؛ فایل ویدیو را آپلود کنید
            {thumbnailUrl ? " (کاور از تصویر بسته پر شده است)" : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-6 pb-4 pt-4">
          {bulkTypeSwitcher}
          <div className="min-h-0 flex-1 overflow-hidden">
            <AdminVideoEditor
              video={video}
              versions={versions}
              categories={categories}
              contentPlans={contentPlans}
              contentTopics={contentTopics}
              isNew
              onClose={() => onOpenChange(false)}
              onSaved={() => {
                onSaved?.();
                onOpenChange(false);
              }}
            />
          </div>
          {onSkip ? (
            <Button type="button" variant="outline" onClick={onSkip} className="shrink-0 self-start">
              <SkipForward className="h-4 w-4" />
              رد کردن
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
