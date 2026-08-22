"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Check, ClipboardCheck, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminCampaign } from "@/components/admin/admin-campaign-provider";
import { DirectiveCtaButton } from "@/components/admin/directive-cta-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  confirmDirectiveSeenAction,
  listUnconfirmedDirectivesAction,
  markDirectiveSeenAction,
} from "@/lib/actions/directive-actions";
import type { CampaignDirective } from "@/lib/types";
import { cn, formatPersianDate, formatPersianDateTime, formatPersianNumber } from "@/lib/utils";

const POLL_INTERVAL_MS = 30_000;

function sortUnconfirmed(rows: CampaignDirective[]): CampaignDirective[] {
  return [...rows].sort((a, b) => {
    const aCrisis = a.crisisMode ? 0 : 1;
    const bCrisis = b.crisisMode ? 0 : 1;
    if (aCrisis !== bCrisis) return aCrisis - bCrisis;

    const aUrgent = a.priority === "urgent" ? 0 : 1;
    const bUrgent = b.priority === "urgent" ? 0 : 1;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;

    return new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime();
  });
}

function OfficialLetterPreview({ item }: { item: CampaignDirective }) {
  if (!item.letterFileUrl) {
    return <p className="text-sm text-muted-foreground">نامه رسمی آپلود نشده</p>;
  }

  const isImage = Boolean(item.letterMimeType?.startsWith("image/"));

  return (
    <div className="space-y-2 rounded-lg border px-3 py-3">
      {isImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.letterFileUrl}
          alt={item.letterFileName || "نامه رسمی"}
          className="max-h-56 w-full rounded-md bg-muted/30 object-contain"
        />
      )}
      <a
        href={item.letterFileUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-start gap-2 text-sm text-primary hover:underline"
      >
        <Download className="mt-0.5 h-4 w-4 shrink-0" />
        <span className="min-w-0">
          <span className="block font-medium text-foreground">
            {item.letterFileName || "نامه رسمی"}
          </span>
          <span className="block text-xs text-muted-foreground">دانلود / مشاهده نامه رسمی</span>
        </span>
      </a>
    </div>
  );
}

/**
 * Blocks the admin panel until the user explicitly confirms each pending directive.
 * Polls for newly published directives so online users see them without a reload.
 */
export function DirectiveAckGate() {
  const { campaignId } = useAdminCampaign();
  const [queue, setQueue] = useState<CampaignDirective[]>([]);
  const [isPending, startTransition] = useTransition();

  const refreshQueue = useCallback(async () => {
    if (!campaignId || document.visibilityState === "hidden") return;
    const result = await listUnconfirmedDirectivesAction(campaignId);
    if (!result.success) return;
    setQueue(sortUnconfirmed(result.directives));
  }, [campaignId]);

  useEffect(() => {
    void refreshQueue();
    const timer = window.setInterval(() => {
      void refreshQueue();
    }, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshQueue();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshQueue]);

  const current = queue[0] ?? null;
  const remainingCount = queue.length;

  useEffect(() => {
    if (!current) return;
    void markDirectiveSeenAction(current.id, campaignId).catch(() => {
      // Passive seen is best-effort for funnel analytics.
    });
  }, [campaignId, current]);

  const queueLabel = useMemo(() => {
    if (remainingCount <= 1) return null;
    return `دستورکار ${formatPersianNumber(1)} از ${formatPersianNumber(remainingCount)}`;
  }, [remainingCount]);

  const confirmSeen = () => {
    if (!current) return;
    startTransition(async () => {
      const result = await confirmDirectiveSeenAction(current.id, campaignId);
      if (!result.success) {
        toast.error(result.error ?? "تأیید مشاهده ثبت نشد");
        return;
      }
      setQueue((prev) => prev.filter((row) => row.id !== current.id));
      toast.success("مشاهده دستورکار تأیید شد");
    });
  };

  if (!current) return null;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className={cn(
          "max-h-[92vh] max-w-2xl overflow-y-auto [&>button]:hidden",
          "z-[110]",
          current.crisisMode || current.priority === "urgent"
            ? "border-destructive/40"
            : "border-primary/30"
        )}
        overlayClassName="z-[100]"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ClipboardCheck
              className={cn(
                "h-5 w-5 shrink-0",
                current.crisisMode || current.priority === "urgent"
                  ? "text-destructive"
                  : "text-primary"
              )}
            />
            <DialogTitle className="flex flex-wrap items-center gap-2 text-right">
              {current.title}
            </DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="space-y-2 text-right">
              <div className="flex flex-wrap items-center gap-2">
                {current.crisisMode ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    بحران
                  </Badge>
                ) : null}
                {current.priority === "urgent" ? (
                  <Badge variant="destructive">فوری</Badge>
                ) : null}
                {current.creationMode === "smart" ? <Badge variant="outline">هوشمند</Badge> : null}
                {queueLabel ? <Badge variant="secondary">{queueLabel}</Badge> : null}
              </div>
              <p className="text-sm font-medium text-foreground">
                برای ادامه کار در پنل، ابتدا این دستورکار را بخوانید و تأیید مشاهده کنید.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="whitespace-pre-wrap text-sm leading-7">{current.body}</p>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>
              انتشار: {formatPersianDateTime(current.publishedAt ?? current.createdAt)}
            </span>
            {current.startDate ? <span>شروع: {formatPersianDate(current.startDate)}</span> : null}
            {current.endDate ?? current.dueDate ? (
              <span>پایان: {formatPersianDate(current.endDate ?? current.dueDate!)}</span>
            ) : null}
          </div>

          {current.attachments.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">پیوست‌ها</p>
              <ul className="space-y-2">
                {current.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <a
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Download className="h-4 w-4 shrink-0" />
                      {attachment.title || attachment.fileName}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm font-medium">نامه رسمی</p>
            <OfficialLetterPreview item={current} />
          </div>

          <DirectiveCtaButton item={current} />

          <Button className="w-full sm:w-auto" disabled={isPending} onClick={confirmSeen}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            تأیید مشاهده
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
