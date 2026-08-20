"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ClipboardCheck, Download, Eye, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { confirmDirectiveSeenAction } from "@/lib/actions/directive-actions";
import { listMyOpenAiSuggestionsAction } from "@/lib/actions/directive-smart-actions";
import type { DirectiveAiSuggestion } from "@/lib/db/repository-directive-smart";
import type { CampaignDirective } from "@/lib/types";
import { adminHref, cn, formatPersianDate, formatPersianDateTime, formatPersianNumber } from "@/lib/utils";
import { DirectiveCtaButton } from "@/components/admin/directive-cta-button";

interface DashboardDirectivesPanelProps {
  campaignId: string;
  /** Kept for call-site compatibility; empty inbox is hidden regardless. */
  canManage?: boolean;
  inboxDirectives: CampaignDirective[];
}

type InboxTab = "new" | "seen";

const PREVIEW_LIMIT = 5;

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
          className="max-h-56 w-full rounded-md object-contain bg-muted/30"
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

function DirectiveDateRange({ item }: { item: CampaignDirective }) {
  const start = item.startDate;
  const end = item.endDate ?? item.dueDate;
  if (!start && !end) return null;
  return (
    <>
      {start && <span>شروع: {formatPersianDate(start)}</span>}
      {end && <span>پایان: {formatPersianDate(end)}</span>}
    </>
  );
}

function sortPreview(rows: CampaignDirective[]): CampaignDirective[] {
  return [...rows].sort((a, b) => {
    const aUrgent = a.priority === "urgent" ? 0 : 1;
    const bUrgent = b.priority === "urgent" ? 0 : 1;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function DashboardDirectivesPanel({
  campaignId,
  inboxDirectives: initialInbox,
}: DashboardDirectivesPanelProps) {
  const [inboxRows, setInboxRows] = useState(initialInbox);
  const [inboxTab, setInboxTab] = useState<InboxTab>("new");
  const [detailItem, setDetailItem] = useState<CampaignDirective | null>(null);
  const [isPending, startTransition] = useTransition();
  const [aiSuggestions, setAiSuggestions] = useState<DirectiveAiSuggestion[]>([]);

  useEffect(() => {
    void listMyOpenAiSuggestionsAction({ limit: 20 }).then((result) => {
      if (result.success) setAiSuggestions(result.suggestions);
    });
  }, []);

  const unreadCount = useMemo(
    () => inboxRows.filter((row) => !row.confirmed).length,
    [inboxRows]
  );
  const seenCount = useMemo(
    () => inboxRows.filter((row) => row.confirmed).length,
    [inboxRows]
  );

  const tabRows = useMemo(() => {
    const filtered =
      inboxTab === "new"
        ? inboxRows.filter((row) => !row.confirmed)
        : inboxRows.filter((row) => row.confirmed);
    return sortPreview(filtered);
  }, [inboxRows, inboxTab]);

  const previewRows = useMemo(() => tabRows.slice(0, PREVIEW_LIMIT), [tabRows]);

  const confirmSeen = (item: CampaignDirective) => {
    startTransition(async () => {
      const result = await confirmDirectiveSeenAction(item.id, campaignId);
      if (!result.success) {
        toast.error(result.error ?? "تأیید مشاهده ثبت نشد");
        return;
      }
      setInboxRows((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? { ...row, confirmed: true, seenAt: new Date().toISOString() }
            : row
        )
      );
      setDetailItem((current) =>
        current?.id === item.id
          ? { ...current, confirmed: true, seenAt: new Date().toISOString() }
          : current
      );
      toast.success("مشاهده تأیید شد");
    });
  };

  const directivesHref = adminHref("/admin/directives", campaignId);
  const hasInbox = inboxRows.length > 0;
  const isCompactSeenOnly = hasInbox && unreadCount === 0;
  const compactPreview = useMemo(
    () => sortPreview(inboxRows.filter((row) => row.confirmed)).slice(0, PREVIEW_LIMIT),
    [inboxRows]
  );

  if (!hasInbox && aiSuggestions.length === 0) {
    return null;
  }

  return (
    <>
      {aiSuggestions.length > 0 ? (
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-primary" />
              اقدامات پیشنهادی امروز
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              پیشنهادهای دستیار اقدام راستا برای دستورکارهای هوشمند شما
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiSuggestions.map((item) => (
              <div key={item.id} className="rounded-lg border bg-background p-3 text-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="break-words font-medium">{item.title}</p>
                    {item.reason ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.reason}</p>
                    ) : null}
                  </div>
                  <Button size="sm" variant="outline" className="w-full shrink-0 sm:w-auto" asChild>
                    <Link href={adminHref(`/admin/directives/${item.directiveId}`, campaignId)}>
                      اتاق عملیات
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {hasInbox ? (
        isCompactSeenOnly ? (
          <Card>
            <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex flex-wrap items-center gap-2">
                <ClipboardCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium">دستورکارها</span>
                <Badge variant="secondary">
                  {formatPersianNumber(seenCount)} دیده‌شده
                </Badge>
                {compactPreview.some((item) => !item.hasActionPlan) ? (
                  <Badge variant="destructive">نیاز به برنامه اقدام</Badge>
                ) : null}
                <span className="truncate text-xs text-muted-foreground">
                  {compactPreview[0]?.title}
                  {seenCount > 1
                    ? ` و ${formatPersianNumber(seenCount - 1)} مورد دیگر`
                    : null}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => setDetailItem(compactPreview[0] ?? null)}
                  disabled={!compactPreview[0]}
                >
                  <Eye className="h-4 w-4" />
                  جزئیات
                </Button>
                <Button size="sm" variant="outline" className="h-8" asChild>
                  <Link href={directivesHref}>مشاهده همه</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-red-500/40 bg-red-500/[0.04]">
            <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <ClipboardCheck className="h-5 w-5 shrink-0 text-red-600" />
                  دستورکارها
                  <Badge variant="destructive">
                    {formatPersianNumber(unreadCount)} جدید
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  دستورکارهای جدید را ببینید، تأیید مشاهده و برنامه اقدام ثبت کنید
                </p>
              </div>
              <Link href={directivesHref} className="w-full sm:w-auto">
                <Button size="sm" className="w-full sm:w-auto">
                  مشاهده همه
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {seenCount > 0 ? (
                <Tabs
                  value={inboxTab}
                  onValueChange={(value) => setInboxTab(value as InboxTab)}
                >
                  <TabsList>
                    <TabsTrigger value="new">
                      جدید ({formatPersianNumber(unreadCount)})
                    </TabsTrigger>
                    <TabsTrigger value="seen">
                      دیده‌شده ({formatPersianNumber(seenCount)})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              ) : null}

              {previewRows.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  {inboxTab === "new"
                    ? "دستورکار جدیدی نیست"
                    : "هنوز دستورکار دیده‌شده‌ای ندارید"}
                </div>
              ) : (
                previewRows.map((item) => (
                  <article
                    key={item.id}
                    className={cn(
                      "rounded-xl border bg-background p-4",
                      item.priority === "urgent" && "border-destructive/40",
                      !item.confirmed && "border-red-500/30"
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="min-w-0 break-words font-semibold">{item.title}</h3>
                          {item.creationMode === "smart" ? (
                            <Badge variant="outline">هوشمند</Badge>
                          ) : null}
                          {item.priority === "urgent" && (
                            <Badge variant="destructive">فوری</Badge>
                          )}
                          {!item.confirmed ? (
                            <Badge>جدید</Badge>
                          ) : !item.hasActionPlan ? (
                            <Badge variant="destructive">نیاز به برنامه اقدام</Badge>
                          ) : (
                            <Badge variant="secondary">تعهد ثبت‌شده</Badge>
                          )}
                        </div>
                        <p className="line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">
                          {item.body}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>
                            انتشار:{" "}
                            {formatPersianDateTime(item.publishedAt ?? item.createdAt)}
                          </span>
                          <DirectiveDateRange item={item} />
                        </div>
                      </div>
                      <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none"
                          onClick={() => setDetailItem(item)}
                        >
                          <Eye className="h-4 w-4" />
                          جزئیات
                        </Button>
                        {!item.confirmed ? (
                          <Button
                            size="sm"
                            className="flex-1 sm:flex-none"
                            disabled={isPending}
                            onClick={() => confirmSeen(item)}
                          >
                            <Check className="h-4 w-4" />
                            تأیید مشاهده
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 sm:flex-none"
                            asChild
                          >
                            <Link href={directivesHref}>برنامه اقدام</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}

              {tabRows.length > PREVIEW_LIMIT && (
                <p className="text-center text-xs text-muted-foreground">
                  و{" "}
                  {formatPersianNumber(tabRows.length - PREVIEW_LIMIT)} مورد دیگر در صفحه
                  دستورکارها
                </p>
              )}
            </CardContent>
          </Card>
        )
      ) : null}

      <Dialog open={Boolean(detailItem)} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {detailItem.title}
                  {detailItem.priority === "urgent" && (
                    <Badge variant="destructive">فوری</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="whitespace-pre-wrap text-sm leading-7">{detailItem.body}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>
                    انتشار:{" "}
                    {formatPersianDateTime(detailItem.publishedAt ?? detailItem.createdAt)}
                  </span>
                  <DirectiveDateRange item={detailItem} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">نامه رسمی</p>
                  <OfficialLetterPreview item={detailItem} />
                </div>
                <DirectiveCtaButton item={detailItem} />
                {!detailItem.confirmed && (
                  <Button
                    className="w-full sm:w-auto"
                    disabled={isPending}
                    onClick={() => confirmSeen(detailItem)}
                  >
                    <Check className="h-4 w-4" />
                    تأیید مشاهده
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
