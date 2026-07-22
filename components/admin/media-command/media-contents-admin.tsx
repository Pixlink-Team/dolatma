"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MediaCommandShell } from "@/components/admin/media-command/media-command-shell";
import { MediaEmptyState } from "@/components/admin/media-command/media-empty-state";
import {
  MediaContentStatusBadge,
  MediaPublishModeBadge,
} from "@/components/admin/media-command/media-status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminHref } from "@/lib/utils";
import { MEDIA_CONTENT_STATUS_LABELS } from "@/lib/media-command/labels";
import type { MediaContent, MediaContentEvent, MediaContentStatus } from "@/lib/media-command/types";
import {
  duplicateMediaContentAction,
  listMediaContentEventsAction,
  updateMediaContentStatusAction,
} from "@/lib/actions/media-command-actions";
import { getMediaPlatformLabel } from "@/lib/media-command/platforms";

interface Props {
  campaignId: string;
  contents: MediaContent[];
}

export function MediaContentsAdmin({ campaignId, contents: initial }: Props) {
  const [contents, setContents] = useState(initial);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MediaContentStatus | "all">("all");
  const [eventsOpen, setEventsOpen] = useState(false);
  const [events, setEvents] = useState<MediaContentEvent[]>([]);
  const [eventsTitle, setEventsTitle] = useState("");

  const filtered = useMemo(() => {
    return contents.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!query.trim()) return true;
      const q = query.trim();
      return item.internalTitle.includes(q) || item.topic.includes(q) || item.mainMessage.includes(q);
    });
  }, [contents, query, statusFilter]);

  const setStatus = async (id: string, status: MediaContentStatus) => {
    const result = await updateMediaContentStatusAction({ campaignId, id, status });
    if (!result.success) {
      toast.error(result.error ?? "تغییر وضعیت ناموفق بود");
      return;
    }
    setContents((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    toast.success(`وضعیت به «${MEDIA_CONTENT_STATUS_LABELS[status]}» تغییر کرد`);
  };

  const duplicate = async (id: string) => {
    const result = await duplicateMediaContentAction(campaignId, id);
    if (!result.success) {
      toast.error(result.error ?? "کپی ناموفق بود");
      return;
    }
    toast.success("نسخه جدید ساخته شد");
    window.location.href = adminHref(`/admin/media-command/publish?edit=${result.id}`, campaignId);
  };

  const openHistory = async (item: MediaContent) => {
    setEventsTitle(item.internalTitle);
    const result = await listMediaContentEventsAction(campaignId, item.id);
    setEvents(result.events ?? []);
    setEventsOpen(true);
  };

  return (
    <MediaCommandShell
      campaignId={campaignId}
      title="محتواها"
      description="فهرست محتواها، وضعیت انتشار و تاریخچه تغییرات"
      actions={
        <Button asChild>
          <Link href={adminHref("/admin/media-command/publish", campaignId)}>ساخت محتوا</Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جست‌وجو..."
          className="max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
          >
            همه
          </Button>
          {(
            [
              "draft",
              "pending_review",
              "scheduled",
              "published",
              "publish_error",
            ] as MediaContentStatus[]
          ).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? "default" : "outline"}
              onClick={() => setStatusFilter(status)}
            >
              {MEDIA_CONTENT_STATUS_LABELS[status]}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <MediaEmptyState
          title="هنوز محتوایی ساخته نشده است"
          description="اولین محتوای چندشبکه‌ای را در استودیوی انتشار بسازید."
          actionLabel="ساخت اولین محتوا"
          actionHref={adminHref("/admin/media-command/publish", campaignId)}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{item.internalTitle || "بدون عنوان"}</h3>
                    <MediaContentStatusBadge status={item.status} />
                    <MediaPublishModeBadge mode={item.publishMode} />
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.mainMessage || item.baseText || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    شبکه‌ها:{" "}
                    {[...new Set(item.targets.map((t) => getMediaPlatformLabel(t.platform)))].join(
                      "، "
                    ) || "—"}
                    {" · "}
                    مالک: {item.ownerName ?? "—"}
                    {item.scheduledAt
                      ? ` · زمان‌بندی: ${new Intl.DateTimeFormat("fa-IR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.scheduledAt))}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={adminHref(
                        `/admin/media-command/publish?edit=${item.id}`,
                        campaignId
                      )}
                    >
                      ویرایش
                    </Link>
                  </Button>
                  {item.status === "pending_review" && (
                    <>
                      <Button size="sm" onClick={() => setStatus(item.id, "approved")}>
                        تأیید
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus(item.id, "needs_revision")}
                      >
                        نیاز به اصلاح
                      </Button>
                    </>
                  )}
                  {(item.status === "approved" || item.status === "scheduled") && (
                    <Button size="sm" onClick={() => setStatus(item.id, "published")}>
                      انتشار
                    </Button>
                  )}
                  {item.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setStatus(item.id, "cancelled")}
                    >
                      لغو
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => duplicate(item.id)}>
                    نسخه جدید
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openHistory(item)}>
                    تاریخچه
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={eventsOpen} onOpenChange={setEventsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تاریخچه: {eventsTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">رویدادی ثبت نشده است.</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{event.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.actorName ?? "سامانه"} ·{" "}
                    {new Intl.DateTimeFormat("fa-IR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(event.createdAt))}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MediaCommandShell>
  );
}
