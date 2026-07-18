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
import { AdminPosterEditor } from "@/components/admin/admin-poster-editor";
import type { ContentTopic } from "@/lib/content-topics";
import { todayISO } from "@/lib/jalali";
import { stripFileAccessToken } from "@/lib/uploads";
import type { MediaCategory, Poster, PosterVersion } from "@/lib/types";

export interface PosterFormInitialValues {
  title?: string;
  description?: string;
  imageUrl?: string;
  notes?: string;
  date?: string;
}

interface PosterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  ownerUserId?: string | null;
  categories: MediaCategory[];
  contentPlans?: string[];
  contentTopics?: ContentTopic[];
  initialValues?: PosterFormInitialValues | null;
  initialValuesKey?: string | null;
  queueLabel?: string;
  onSaved?: () => void;
  onSkip?: () => void;
  bulkTypeSwitcher?: ReactNode;
}

const editorDialogClass =
  "!flex min-h-0 max-h-[92vh] max-w-2xl flex-col gap-0 overflow-hidden p-0";

export function PosterFormDialog({
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
}: PosterFormDialogProps) {
  const [posterId, setPosterId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!open) return;
    setPosterId(crypto.randomUUID());
  }, [open, initialValuesKey]);

  const imageUrl = stripFileAccessToken(initialValues?.imageUrl?.trim() || "");
  const now = new Date().toISOString();

  const poster: Poster = useMemo(
    () => ({
      id: posterId,
      campaignId,
      categoryId: categories[0]?.id ?? "",
      title: initialValues?.title?.trim() || "پوستر جدید",
      description: initialValues?.description?.trim() || "",
      published: true,
      sortOrder: 1,
      planLabel: null,
      ownerUserId: ownerUserId || null,
      createdAt: now,
      updatedAt: now,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount identity via posterId
    [posterId, campaignId, categories, initialValues, ownerUserId]
  );

  const versions: PosterVersion[] = useMemo(() => {
    if (!imageUrl) return [];
    return [
      {
        id: crypto.randomUUID(),
        posterId,
        versionNumber: 1,
        imageUrl,
        thumbnailUrl: imageUrl,
        notes: initialValues?.notes?.trim() || null,
        status: "final",
        isFinal: true,
        date: initialValues?.date || todayISO(),
        createdAt: now,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount identity via posterId
  }, [imageUrl, posterId, initialValues]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={editorDialogClass}>
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle>پوستر جدید</DialogTitle>
          <DialogDescription>
            {queueLabel ? `${queueLabel} — ` : ""}
            داده‌های Excel پر شده‌اند؛ در صورت نیاز اصلاح کنید.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-6 pb-4 pt-4">
          {bulkTypeSwitcher}
          <div className="min-h-0 flex-1 overflow-hidden">
            <AdminPosterEditor
              poster={poster}
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
