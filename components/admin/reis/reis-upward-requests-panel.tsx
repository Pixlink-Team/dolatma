"use client";

import { useMemo, useState, useTransition } from "react";
import { MessageSquarePlus, Reply, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createStrategicUpwardRequestAction,
  respondStrategicUpwardRequestAction,
  updateStrategicUpwardRequestStatusAction,
} from "@/lib/actions/strategic-request-actions";
import {
  STRATEGIC_REQUEST_STATUS_LABELS,
  type StrategicUpwardRequest,
} from "@/lib/strategic-requests";
import { formatPersianDateTime, formatPersianNumber } from "@/lib/utils";

type ReisUpwardRequestsPanelProps = {
  campaignId: string;
  initialRequests: StrategicUpwardRequest[];
  /** When true, user can answer requests (reis / superiors). */
  canRespond: boolean;
  /** When true, show compose form for sending upward. */
  canCreate: boolean;
};

export function ReisUpwardRequestsPanel({
  campaignId,
  initialRequests,
  canRespond,
  canCreate,
}: ReisUpwardRequestsPanelProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const pendingCount = useMemo(
    () => requests.filter((row) => row.status === "pending" || row.status === "reviewing").length,
    [requests]
  );

  const submitRequest = () => {
    startTransition(async () => {
      const result = await createStrategicUpwardRequestAction({
        campaignId,
        title,
        body,
      });
      if (!result.success || !result.request) {
        toast.error(result.error ?? "ثبت درخواست ناموفق بود");
        return;
      }
      setRequests((prev) => [result.request!, ...prev]);
      setTitle("");
      setBody("");
      toast.success("درخواست برای بالاسری ثبت شد");
    });
  };

  const respond = (id: string) => {
    const responseBody = (responseDrafts[id] ?? "").trim();
    if (!responseBody) {
      toast.error("متن پاسخ را وارد کنید");
      return;
    }
    startTransition(async () => {
      const result = await respondStrategicUpwardRequestAction({ id, responseBody });
      if (!result.success || !result.request) {
        toast.error(result.error ?? "ثبت پاسخ ناموفق بود");
        return;
      }
      setRequests((prev) =>
        prev.map((row) => (row.id === id ? result.request! : row))
      );
      setResponseDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success("پاسخ ثبت شد");
    });
  };

  const markReviewing = (id: string) => {
    startTransition(async () => {
      const result = await updateStrategicUpwardRequestStatusAction({
        id,
        status: "reviewing",
      });
      if (!result.success || !result.request) {
        toast.error(result.error ?? "به‌روزرسانی وضعیت ناموفق بود");
        return;
      }
      setRequests((prev) =>
        prev.map((row) => (row.id === id ? result.request! : row))
      );
    });
  };

  return (
    <div className="space-y-5" dir="rtl">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">درخواست‌های بالاسری</CardTitle>
              <CardDescription>
                زیرمجموعه‌ها درخواست خود را به بالاسری می‌فرستند؛ اینجا همه درخواست‌ها دیده و پاسخ
                داده می‌شود.
              </CardDescription>
            </div>
            <Badge variant="outline">
              {formatPersianNumber(pendingCount)} در انتظار / در حال بررسی
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {canCreate ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquarePlus className="h-4 w-4 text-primary" />
              ارسال درخواست جدید به بالاسری
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="upward-title">عنوان</Label>
              <Input
                id="upward-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="موضوع درخواست"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upward-body">شرح درخواست</Label>
              <Textarea
                id="upward-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={4}
                placeholder="توضیح نیاز، مانع یا درخواست پشتیبانی"
              />
            </div>
            <Button disabled={isPending} onClick={submitRequest} className="gap-1.5">
              <Send className="h-4 w-4" />
              ارسال درخواست
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            هنوز درخواستی ثبت نشده است.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      از {item.requesterName || item.requesterEmail || "کاربر"} ·{" "}
                      {formatPersianDateTime(item.createdAt)}
                      {item.targetName ? ` · به ${item.targetName}` : " · به بالاترین سطح"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      item.status === "answered"
                        ? "secondary"
                        : item.status === "pending"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {STRATEGIC_REQUEST_STATUS_LABELS[item.status]}
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {item.body}
                </p>

                {item.responseBody ? (
                  <div className="rounded-xl border bg-muted/40 px-3 py-2 text-sm">
                    <p className="mb-1 text-xs font-medium text-foreground">
                      پاسخ {item.respondedByName ? `(${item.respondedByName})` : ""}
                      {item.respondedAt ? ` · ${formatPersianDateTime(item.respondedAt)}` : ""}
                    </p>
                    <p className="whitespace-pre-wrap leading-7 text-muted-foreground">
                      {item.responseBody}
                    </p>
                  </div>
                ) : null}

                {canRespond && item.status !== "answered" && item.status !== "closed" ? (
                  <div className="space-y-2 border-t pt-3">
                    <Label htmlFor={`response-${item.id}`}>پاسخ</Label>
                    <Textarea
                      id={`response-${item.id}`}
                      rows={3}
                      value={responseDrafts[item.id] ?? ""}
                      onChange={(event) =>
                        setResponseDrafts((prev) => ({
                          ...prev,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder="پاسخ یا دستور پیگیری"
                    />
                    <div className="flex flex-wrap gap-2">
                      {item.status === "pending" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => markReviewing(item.id)}
                        >
                          در حال بررسی
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        disabled={isPending}
                        className="gap-1.5"
                        onClick={() => respond(item.id)}
                      >
                        <Reply className="h-4 w-4" />
                        ثبت پاسخ
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
