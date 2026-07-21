"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listBestPracticesAction,
  listBestPracticeSuggestionsAction,
  setBestPracticeStatusAction,
  suggestBestPracticeAction,
} from "@/lib/actions/best-practice-actions";
import type { BestPractice, ScoreableContentType } from "@/lib/types";
import { formatPersianDateTime, formatPersianNumber } from "@/lib/utils";

const CONTENT_TYPE_LABELS: Record<ScoreableContentType, string> = {
  billboard: "تبلیغات محیطی",
  poster: "پوستر",
  video: "ویدیو",
  file: "فایل",
  raw_media: "راش",
  social_post: "پست شبکه اجتماعی",
  site_publication: "انتشار سایت",
  activity: "اقدام",
  broadcast: "صدا و سیما",
  meeting: "جلسه",
};

interface BestPracticesAdminProps {
  campaignId: string;
  canManage: boolean;
  initialApproved: BestPractice[];
  initialPending: BestPractice[];
  initialHighScore: Array<{
    contentType: ScoreableContentType;
    contentId: string;
    title: string;
    score: number;
  }>;
}

export function BestPracticesAdmin({
  campaignId,
  canManage,
  initialApproved,
  initialPending,
  initialHighScore,
}: BestPracticesAdminProps) {
  const [approved, setApproved] = useState(initialApproved);
  const [pending, setPending] = useState(initialPending);
  const [highScore, setHighScore] = useState(initialHighScore);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      const [lib, suggestions] = await Promise.all([
        listBestPracticesAction(campaignId, "approved"),
        canManage
          ? listBestPracticeSuggestionsAction(campaignId)
          : Promise.resolve({ success: true as const, items: [], highScore: [] }),
      ]);
      if (lib.success) setApproved(lib.items);
      if (suggestions.success) {
        setPending(suggestions.items);
        setHighScore(suggestions.highScore);
      }
    });
  };

  return (
    <div className="space-y-6">
      {canManage ? (
        <>
          <section className="space-y-3 rounded-xl border p-4">
            <h2 className="font-semibold">پیشنهادهای امتیاز بالا</h2>
            {highScore.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                محتوای امتیازبالای تأییدنشده‌ای نیست.
              </p>
            ) : (
              highScore.map((item) => (
                <div
                  key={`${item.contentType}-${item.contentId}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {CONTENT_TYPE_LABELS[item.contentType]} · امتیاز{" "}
                      {formatPersianNumber(item.score)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await suggestBestPracticeAction({
                          campaignId,
                          contentType: item.contentType,
                          contentId: item.contentId,
                          title: item.title,
                          suggestedScore: item.score,
                        });
                        if (!result.success) {
                          toast.error(result.error);
                          return;
                        }
                        toast.success("به صف پیشنهاد اضافه شد");
                        refresh();
                      });
                    }}
                  >
                    پیشنهاد به کتابخانه
                  </Button>
                </div>
              ))
            )}
          </section>

          <section className="space-y-3 rounded-xl border p-4">
            <h2 className="font-semibold">در انتظار تأیید</h2>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">پیشنهاد معلقی نیست.</p>
            ) : (
              pending.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {CONTENT_TYPE_LABELS[item.contentType]}
                      {item.suggestedScore != null
                        ? ` · امتیاز ${formatPersianNumber(item.suggestedScore)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await setBestPracticeStatusAction({
                            id: item.id,
                            campaignId,
                            status: "approved",
                          });
                          if (!result.success) {
                            toast.error(result.error);
                            return;
                          }
                          toast.success("به کتابخانه اضافه شد");
                          refresh();
                        });
                      }}
                    >
                      تأیید
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await setBestPracticeStatusAction({
                            id: item.id,
                            campaignId,
                            status: "rejected",
                          });
                          if (!result.success) {
                            toast.error(result.error);
                            return;
                          }
                          toast.success("رد شد");
                          refresh();
                        });
                      }}
                    >
                      رد
                    </Button>
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      ) : null}

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="font-semibold">کتابخانه بهترین اقدامات</h2>
        {approved.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز موردی تأیید نشده است.</p>
        ) : (
          approved.map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{item.title}</p>
                <Badge variant="secondary">{CONTENT_TYPE_LABELS[item.contentType]}</Badge>
                {item.suggestedScore != null ? (
                  <Badge variant="outline">
                    امتیاز {formatPersianNumber(item.suggestedScore)}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                تأیید: {item.approvedByName ?? "—"}
                {item.approvedAt ? ` · ${formatPersianDateTime(item.approvedAt)}` : ""}
              </p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
