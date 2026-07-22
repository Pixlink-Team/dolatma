"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MediaCommandShell } from "@/components/admin/media-command/media-command-shell";
import { MediaEmptyState } from "@/components/admin/media-command/media-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMediaPlatformLabel } from "@/lib/media-command/platforms";
import { MEDIA_INTERACTION_STATUS_LABELS } from "@/lib/media-command/labels";
import type { MediaInteraction, MediaInteractionStatus } from "@/lib/media-command/types";
import {
  generateSmartReplyAction,
  upsertMediaInteractionAction,
} from "@/lib/actions/media-command-actions";
import { adminHref } from "@/lib/utils";
import Link from "next/link";

interface Props {
  campaignId: string;
  interactions: MediaInteraction[];
  smartMode?: boolean;
}

const FILTERS: Array<{ key: string; label: string; match: (i: MediaInteraction) => boolean }> = [
  { key: "all", label: "همه", match: () => true },
  {
    key: "unanswered",
    label: "بدون پاسخ",
    match: (i) => !["replied", "closed"].includes(i.status),
  },
  { key: "replied", label: "پاسخ‌داده‌شده", match: (i) => i.status === "replied" },
  { key: "urgent", label: "فوری", match: (i) => i.importance === "urgent" },
  {
    key: "negative",
    label: "بازخورد منفی",
    match: (i) => i.sentiment === "negative",
  },
  {
    key: "complaint",
    label: "شکایت",
    match: (i) => (i.topicTag ?? "").includes("شکایت"),
  },
];

export function MediaInboxAdmin({ campaignId, interactions: initial, smartMode }: Props) {
  const [interactions, setInteractions] = useState(initial);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<MediaInteraction | null>(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const rule = FILTERS.find((f) => f.key === filter)?.match ?? (() => true);
    return interactions.filter((item) => {
      if (!rule(item)) return false;
      if (!query.trim()) return true;
      return item.body.includes(query) || item.authorName.includes(query);
    });
  }, [interactions, filter, query]);

  const openItem = (item: MediaInteraction) => {
    setActive(item);
    setReply(item.finalReply || item.suggestedReply || "");
  };

  const suggest = async () => {
    if (!active) return;
    const result = await generateSmartReplyAction({
      campaignId,
      interactionId: active.id,
      body: active.body,
      topicTag: active.topicTag,
    });
    if (!result.success) {
      toast.error(result.error ?? "پیشنهاد پاسخ ناموفق بود");
      return;
    }
    setReply(result.suggestedReply);
    toast.success(`پیشنهاد اقدام: ${result.actionSuggestion}`);
  };

  const submitReply = async () => {
    if (!active) return;
    setSaving(true);
    const result = await upsertMediaInteractionAction({
      id: active.id,
      campaignId,
      accountId: active.accountId,
      platform: active.platform,
      kind: active.kind,
      authorName: active.authorName,
      body: active.body,
      relatedContentId: active.relatedContentId,
      status: "replied",
      importance: active.importance,
      topicTag: active.topicTag,
      sentiment: active.sentiment,
      assigneeUserId: active.assigneeUserId,
      suggestedReply: active.suggestedReply,
      finalReply: reply,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error ?? "ثبت پاسخ ناموفق بود");
      return;
    }
    toast.success("پاسخ ثبت شد (انتشار بدون تأیید انسانی انجام نمی‌شود مگر با مجوز قبلی)");
    setInteractions((prev) =>
      prev.map((i) =>
        i.id === active.id ? { ...i, status: "replied" as MediaInteractionStatus, finalReply: reply } : i
      )
    );
    setActive(null);
  };

  return (
    <MediaCommandShell
      campaignId={campaignId}
      title={smartMode ? "پاسخ هوشمند" : "صندوق تعاملات"}
      description={
        smartMode
          ? "پیشنهاد پاسخ بر اساس پیام مصوب، FAQ و کتابخانه رسمی — همیشه نیازمند تأیید انسانی"
          : "کامنت‌ها، پیام‌ها و بازخوردهای حساب‌های متصل در یک صندوق یکپارچه"
      }
      actions={
        smartMode ? (
          <Button asChild variant="outline">
            <Link href={adminHref("/admin/media-command/inbox", campaignId)}>بازگشت به صندوق</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={adminHref("/admin/media-command/smart-reply", campaignId)}>
              پاسخ هوشمند
            </Link>
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جست‌وجو در متن یا نام مخاطب..."
          className="max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={filter === item.key ? "default" : "outline"}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <MediaEmptyState
          title="هنوز تعاملی ثبت نشده است"
          description="پس از اتصال حساب‌ها و دریافت کامنت/پیام، اینجا نمایش داده می‌شوند."
          actionLabel="مشاهده حساب‌های متصل"
          actionHref={adminHref("/admin/media-command/accounts", campaignId)}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.authorName}</span>
                    <Badge variant="secondary">{getMediaPlatformLabel(item.platform)}</Badge>
                    <Badge>{MEDIA_INTERACTION_STATUS_LABELS[item.status]}</Badge>
                    {item.importance === "urgent" && <Badge variant="destructive">فوری</Badge>}
                    {item.sentiment && <Badge variant="outline">{item.sentiment}</Badge>}
                  </div>
                  <p className="text-sm">{item.body}</p>
                  <p className="text-xs text-muted-foreground">
                    حساب: {item.accountName ?? "—"} · محتوا: {item.relatedContentTitle ?? "—"} ·{" "}
                    {new Intl.DateTimeFormat("fa-IR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(item.receivedAt))}
                  </p>
                  {item.suggestedReply && (
                    <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                      پیشنهاد AI: {item.suggestedReply}
                    </p>
                  )}
                </div>
                <Button size="sm" onClick={() => openItem(item)}>
                  {smartMode ? "پاسخ هوشمند" : "پاسخ"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(active)} onOpenChange={(next) => !next && setActive(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>پاسخ به {active?.authorName}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{active?.body}</p>
          <Textarea rows={6} value={reply} onChange={(e) => setReply(e.target.value)} />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={suggest}>
              پیشنهاد هوشمند
            </Button>
            <Button onClick={submitReply} disabled={saving || !reply.trim()}>
              {saving ? "در حال ثبت..." : "تأیید و ثبت پاسخ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MediaCommandShell>
  );
}
