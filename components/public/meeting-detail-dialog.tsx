"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { CalendarDays, Lock, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { MeetingPublicDetail, MeetingPublicPreview } from "@/lib/types";
import { cn, formatPersianDate } from "@/lib/utils";

interface MeetingDetailDialogProps {
  preview: MeetingPublicPreview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cachedDetail?: MeetingPublicDetail | null;
  meetingsHasPassword: boolean;
  isUnlocked: boolean;
}

export function MeetingDetailDialog({
  preview,
  open,
  onOpenChange,
  cachedDetail,
  meetingsHasPassword,
  isUnlocked,
}: MeetingDetailDialogProps) {
  const [detail, setDetail] = useState<MeetingPublicDetail | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !preview) {
      setDetail(null);
      return;
    }

    if (cachedDetail) {
      setDetail(cachedDetail);
      return;
    }

    if (meetingsHasPassword && !isUnlocked) {
      setDetail(null);
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/meetings/${preview.id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "" }),
      });
      if (!response.ok) {
        toast.error("بارگذاری جزئیات ناموفق بود");
        return;
      }
      const data = (await response.json()) as { meeting: MeetingPublicDetail };
      setDetail(data.meeting);
    });
  }, [open, preview, cachedDetail, meetingsHasPassword, isUnlocked]);

  if (!preview) return null;

  const completedCount = detail?.tasks.filter((task) => task.completed).length ?? 0;
  const totalTasks = detail?.tasks.length ?? 0;
  const needsSectionUnlock = meetingsHasPassword && !isUnlocked && !cachedDetail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{preview.title}</DialogTitle>
        </DialogHeader>

        {needsSectionUnlock ? (
          <div className="space-y-3 py-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              برای مشاهده جزئیات، ابتدا رمز جلسات را در بالای بخش وارد کنید.
            </div>
          </div>
        ) : detail ? (
          <div className="space-y-4">
            {detail.imageUrl && (
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                <Image
                  src={detail.imageUrl}
                  alt={detail.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 640px"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {formatPersianDate(detail.meetingDate)}
              </span>
              {detail.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {detail.location}
                </span>
              )}
            </div>

            {detail.attendees.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  حاضرین جلسه
                </div>
                <div className="flex flex-wrap gap-2">
                  {detail.attendees.map((name) => (
                    <span key={name} className="rounded-full border bg-muted/40 px-3 py-1 text-xs">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detail.discussionSummary && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{detail.discussionSummary}</p>
            )}

            {detail.audioUrl && (
              <div className="space-y-2">
                <Label>فایل صوتی جلسه</Label>
                <audio src={detail.audioUrl} controls className="w-full" preload="metadata" />
              </div>
            )}

            {totalTasks > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-medium">مصوبات</h4>
                  <span className="text-xs text-muted-foreground">
                    {completedCount}/{totalTasks} انجام‌شده
                  </span>
                </div>
                <ul className="space-y-2 rounded-lg border bg-muted/20 p-3">
                  {detail.tasks.map((task) => (
                    <li key={task.id} className="flex items-start gap-2 text-sm">
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                          task.completed
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-background"
                        )}
                        aria-hidden
                      >
                        {task.completed ? "✓" : ""}
                      </span>
                      <span className={cn(task.completed && "line-through text-muted-foreground")}>
                        {task.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail.decisions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">تصمیم‌های جلسه</h4>
                <ul className="space-y-2 rounded-lg border bg-muted/20 p-3">
                  {detail.decisions.map((decision) => (
                    <li key={decision.id} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      <span>{decision.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {isPending ? "در حال بارگذاری…" : "جزئیات در دسترس نیست"}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
