"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ChevronDown, ExternalLink, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { ContentMessageChatThread } from "@/components/admin/content-message-chat-thread";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listContentMessagesForCardAction,
  listMyContentMessagesAction,
  markMyContentMessagesSeenAction,
  type ContentMessageListItem,
} from "@/lib/actions/content-message-actions";
import { emitContentMessagesUnreadChanged } from "@/lib/content-messages-unread";
import {
  threadFromRoots,
  type ContentMessageThreadViewer,
} from "@/lib/content-messages/thread";
import {
  adminHref,
  cn,
  formatPersianDateTime,
  formatPersianNumber,
} from "@/lib/utils";

type ContentThreadCard = {
  key: string;
  contentType: ContentMessageListItem["contentType"];
  contentId: string;
  contentTitle: string;
  contentTypeLabel: string;
  adminPath: string;
  campaignId: string;
  messages: ContentMessageListItem[];
  unreadCount: number;
  latestAt: string;
};

function cardKey(message: Pick<ContentMessageListItem, "contentType" | "contentId">): string {
  return `${message.contentType}:${message.contentId}`;
}

function buildThreadCards(
  received: ContentMessageListItem[],
  sent: ContentMessageListItem[]
): ContentThreadCard[] {
  const byKey = new Map<string, ContentThreadCard>();
  const seenIds = new Set<string>();

  const upsert = (message: ContentMessageListItem) => {
    if (seenIds.has(message.id)) return;
    seenIds.add(message.id);

    const key = cardKey(message);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        key,
        contentType: message.contentType,
        contentId: message.contentId,
        contentTitle: message.contentTitle || "بدون عنوان",
        contentTypeLabel: message.contentTypeLabel,
        adminPath: message.adminPath,
        campaignId: message.campaignId,
        messages: [message],
        unreadCount: message.isUnread ? 1 : 0,
        latestAt: message.createdAt,
      });
      return;
    }

    existing.messages.push(message);
    if (message.isUnread) existing.unreadCount += 1;
    if (new Date(message.createdAt).getTime() > new Date(existing.latestAt).getTime()) {
      existing.latestAt = message.createdAt;
      existing.contentTitle = message.contentTitle || existing.contentTitle;
    }
  };

  for (const message of received) upsert(message);
  for (const message of sent) upsert(message);

  return [...byKey.values()].sort(
    (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
  );
}

function latestPreview(messages: ContentMessageListItem[]): string {
  const latest = [...messages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
  if (!latest) return "";
  const text = latest.body.trim().replace(/\s+/g, " ");
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

export function ContentMessagesPanel({
  campaignId,
  initialReceived = [],
  initialSent = [],
  canSend = false,
}: {
  campaignId: string;
  initialReceived?: ContentMessageListItem[];
  initialSent?: ContentMessageListItem[];
  canSend?: boolean;
}) {
  const [received, setReceived] = useState(initialReceived);
  const [sent, setSent] = useState(initialSent);
  const [canSendMessages, setCanSendMessages] = useState(canSend);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [threadOverride, setThreadOverride] = useState<
    Record<string, ContentMessageListItem[]>
  >({});
  const [loadingThreadKey, setLoadingThreadKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cards = useMemo(() => buildThreadCards(received, sent), [received, sent]);
  const unreadCount = received.filter((item) => item.isUnread).length;
  const viewer: ContentMessageThreadViewer = canSendMessages ? "staff" : "owner";

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await listMyContentMessagesAction({ campaignId });
      if (!result.success) {
        toast.error(result.error ?? "بارگذاری پیام‌ها ناموفق بود");
        return;
      }
      setReceived(result.received ?? []);
      setSent(result.sent ?? []);
      setCanSendMessages(Boolean(result.canSend));
      setThreadOverride({});
      const nextUnread = (result.received ?? []).filter((item) => item.isUnread).length;
      emitContentMessagesUnreadChanged(nextUnread);
    });
  }, [campaignId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (unreadCount === 0) return;

    const timer = window.setTimeout(() => {
      void markMyContentMessagesSeenAction().then((result) => {
        if (!result.success) return;
        setReceived((prev) =>
          prev.map((item) => ({
            ...item,
            seenAt: item.seenAt ?? new Date().toISOString(),
            isUnread: false,
          }))
        );
        emitContentMessagesUnreadChanged(0);
      });
    }, 800);

    return () => window.clearTimeout(timer);
  }, [unreadCount, received.length]);

  const loadFullThread = useCallback(
    async (card: ContentThreadCard) => {
      if (!canSendMessages) return;
      setLoadingThreadKey(card.key);
      try {
        const result = await listContentMessagesForCardAction({
          contentType: card.contentType,
          contentId: card.contentId,
        });
        if (!result.success) {
          toast.error(result.error ?? "بارگذاری گفتگو ناموفق بود");
          return;
        }
        setThreadOverride((prev) => ({
          ...prev,
          [card.key]: result.messages ?? [],
        }));
      } finally {
        setLoadingThreadKey(null);
      }
    },
    [canSendMessages]
  );

  const toggleCard = useCallback(
    (card: ContentThreadCard) => {
      const nextKey = expandedKey === card.key ? null : card.key;
      setExpandedKey(nextKey);
      if (nextKey && canSendMessages && !threadOverride[card.key]) {
        void loadFullThread(card);
      }
    },
    [canSendMessages, expandedKey, loadFullThread, threadOverride]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">پیام‌های من</h1>
          <p className="text-sm text-muted-foreground">
            گفتگوهای مربوط به هر کارت محتوا — با زدن روی کارت، پیام‌های ارسالی و دریافتی را ببینید
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={refresh}>
          بروزرسانی
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border py-12 text-center text-muted-foreground">
          هنوز گفتگویی درباره کارت‌های محتوا ثبت نشده است.
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => {
            const expanded = expandedKey === card.key;
            const threadMessages = threadOverride[card.key] ?? card.messages;
            const chatItems = threadFromRoots(threadMessages, viewer);
            const preview = latestPreview(card.messages);
            const isLoadingThread = loadingThreadKey === card.key;

            return (
              <article
                key={card.key}
                className={cn(
                  "overflow-hidden rounded-xl border transition-colors",
                  card.unreadCount > 0 ? "border-primary/40 bg-primary/5" : "bg-card"
                )}
              >
                <button
                  type="button"
                  className="flex w-full items-start gap-3 p-4 text-start"
                  onClick={() => toggleCard(card)}
                  aria-expanded={expanded}
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {card.contentTypeLabel}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {formatPersianNumber(card.messages.length)} پیام
                      </Badge>
                      {card.unreadCount > 0 && (
                        <Badge variant="default" className="text-[10px]">
                          {formatPersianNumber(card.unreadCount)} جدید
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium leading-snug">{card.contentTitle}</h3>
                    <p className="text-xs text-muted-foreground">
                      آخرین پیام · {formatPersianDateTime(card.latestAt)}
                    </p>
                    {!expanded && preview ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{preview}</p>
                    ) : null}
                  </div>
                  <ChevronDown
                    className={cn(
                      "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      expanded && "rotate-180"
                    )}
                  />
                </button>

                {expanded ? (
                  <div className="space-y-3 border-t px-4 pb-4 pt-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" className="gap-1.5" asChild>
                        <Link href={adminHref(card.adminPath, card.campaignId)} prefetch={false}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          مشاهده کارت
                        </Link>
                      </Button>
                    </div>
                    {isLoadingThread ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        در حال بارگذاری گفتگو…
                      </p>
                    ) : (
                      <ContentMessageChatThread items={chatItems} />
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
