"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminHref } from "@/lib/utils";
import {
  PLATFORM_LABELS,
  RESPONSE_TYPE_LABELS,
  SENTIMENT_LABELS,
  URGENCY_LABELS,
} from "@/lib/monitoring/labels";
import type {
  MediaSource,
  MonitoringOrganization,
  ResponseType,
  Sentiment,
  UrgencyLevel,
} from "@/lib/monitoring/types";
import {
  createMonitoredItemAction,
  ensureMonitoringReadyAction,
  getMonitoringLookupsAction,
} from "@/lib/actions/monitoring-actions";

type SubmitMode = "save" | "submit_review" | "convert_to_case";

const emptyForm = {
  organizationId: "",
  title: "",
  summary: "",
  fullText: "",
  sourceUrl: "",
  sourceId: "",
  platform: "news",
  authorName: "",
  publishedAt: "",
  viewCount: "0",
  likeCount: "0",
  commentCount: "0",
  shareCount: "0",
  repostCount: "0",
  geographicScope: "",
  provinceId: "",
  sentiment: "negative" as Sentiment,
  urgencyLevel: "high" as UrgencyLevel,
  suggestedResponseType: "official_response" as ResponseType,
  responseDeadlineHours: "6",
  expertNotes: "",
};

export function MonitoringItemFormAdmin({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<MonitoringOrganization[]>([]);
  const [sources, setSources] = useState<MediaSource[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setLoading(true);
      await ensureMonitoringReadyAction(campaignId);
      const lookups = await getMonitoringLookupsAction();
      if (!lookups.success) {
        toast.error(lookups.error);
        setLoading(false);
        return;
      }
      setOrganizations(lookups.organizations);
      setSources(lookups.sources);
      if (lookups.organizations[0]) {
        setForm((prev) => ({ ...prev, organizationId: lookups.organizations[0].id }));
      }
      setLoading(false);
    });
  }, [campaignId]);

  const setField = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = (mode: SubmitMode) => {
    if (!form.organizationId.trim()) {
      toast.error("سازمان را انتخاب کنید.");
      return;
    }
    if (!form.title.trim() || !form.summary.trim() || !form.fullText.trim()) {
      toast.error("عنوان، خلاصه و متن کامل الزامی است.");
      return;
    }

    startTransition(async () => {
      const result = await createMonitoredItemAction({
        organizationId: form.organizationId,
        title: form.title.trim(),
        summary: form.summary.trim(),
        fullText: form.fullText.trim(),
        sourceUrl: form.sourceUrl.trim() || null,
        sourceId: form.sourceId || null,
        platform: form.platform,
        authorName: form.authorName.trim() || null,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
        viewCount: Number(form.viewCount) || 0,
        likeCount: Number(form.likeCount) || 0,
        commentCount: Number(form.commentCount) || 0,
        shareCount: Number(form.shareCount) || 0,
        repostCount: Number(form.repostCount) || 0,
        geographicScope: form.geographicScope.trim() || null,
        provinceId: form.provinceId.trim() || null,
        sentiment: form.sentiment,
        urgencyLevel: form.urgencyLevel,
        suggestedResponseType: form.suggestedResponseType,
        responseDeadlineHours: Number(form.responseDeadlineHours) || null,
        expertNotes: form.expertNotes.trim() || null,
        relatedCampaignId: campaignId,
        mode,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      if (mode === "convert_to_case" && result.caseId) {
        toast.success("خبر ثبت و پرونده واکنش سریع ایجاد شد");
        router.push(adminHref(`/admin/rapid-response/cases/${result.caseId}`, campaignId));
        return;
      }

      toast.success(mode === "submit_review" ? "برای بررسی ارسال شد" : "خبر ذخیره شد");
      router.push(adminHref(`/admin/monitoring/items/${result.item.id}`, campaignId));
    });
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">در حال بارگذاری فرم...</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold">ثبت دستی خبر منفی</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          خبر شناسایی‌شده توسط تیم رصد را با جزئیات کامل ثبت کنید
        </p>
      </div>

      <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-2">
        <div className="space-y-1 md:col-span-2">
          <Label>سازمان</Label>
          <Select value={form.organizationId} onValueChange={(v) => setField("organizationId", v)}>
            <SelectTrigger>
              <SelectValue placeholder="انتخاب سازمان" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.shortName || org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label>عنوان</Label>
          <Input
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="مثلاً: ادعا درباره تأخیر در ارائه خدمات سازمان"
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label>خلاصه</Label>
          <Textarea
            value={form.summary}
            onChange={(e) => setField("summary", e.target.value)}
            placeholder="خلاصه کوتاه خبر برای نمایش در جریان رصد..."
            rows={3}
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label>متن کامل</Label>
          <Textarea
            value={form.fullText}
            onChange={(e) => setField("fullText", e.target.value)}
            placeholder="متن کامل خبر یا پست را وارد کنید..."
            rows={6}
          />
        </div>

        <div className="space-y-1">
          <Label>لینک منبع</Label>
          <Input
            value={form.sourceUrl}
            onChange={(e) => setField("sourceUrl", e.target.value)}
            placeholder="https://example.com/news/..."
            dir="ltr"
            className="text-left"
          />
        </div>

        <div className="space-y-1">
          <Label>منبع رسانه‌ای</Label>
          <Select
            value={form.sourceId || "none"}
            onValueChange={(v) => setField("sourceId", v === "none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="انتخاب منبع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">بدون منبع مشخص</SelectItem>
              {sources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>پلتفرم</Label>
          <Select value={form.platform} onValueChange={(v) => setField("platform", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>نام نویسنده / کانال</Label>
          <Input
            value={form.authorName}
            onChange={(e) => setField("authorName", e.target.value)}
            placeholder="مثلاً: کانال خبری الف"
          />
        </div>

        <div className="space-y-1">
          <Label>زمان انتشار</Label>
          <Input
            type="datetime-local"
            value={form.publishedAt}
            onChange={(e) => setField("publishedAt", e.target.value)}
            dir="ltr"
            className="text-left"
          />
        </div>

        <div className="space-y-1">
          <Label>محدوده جغرافیایی</Label>
          <Input
            value={form.geographicScope}
            onChange={(e) => setField("geographicScope", e.target.value)}
            placeholder="مثلاً: ملی / استانی / شهری"
          />
        </div>

        <div className="space-y-1">
          <Label>شناسه استان (اختیاری)</Label>
          <Input
            value={form.provinceId}
            onChange={(e) => setField("provinceId", e.target.value)}
            placeholder="شناسه استان"
            dir="ltr"
            className="text-left"
          />
        </div>

        <div className="space-y-1">
          <Label>بازدید</Label>
          <Input
            type="number"
            min={0}
            value={form.viewCount}
            onChange={(e) => setField("viewCount", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>لایک</Label>
          <Input
            type="number"
            min={0}
            value={form.likeCount}
            onChange={(e) => setField("likeCount", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>نظر</Label>
          <Input
            type="number"
            min={0}
            value={form.commentCount}
            onChange={(e) => setField("commentCount", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>بازنشر / شیر</Label>
          <Input
            type="number"
            min={0}
            value={form.shareCount}
            onChange={(e) => setField("shareCount", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>ریپست</Label>
          <Input
            type="number"
            min={0}
            value={form.repostCount}
            onChange={(e) => setField("repostCount", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label>احساسات</Label>
          <Select
            value={form.sentiment}
            onValueChange={(v) => setField("sentiment", v as Sentiment)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SENTIMENT_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>فوریت</Label>
          <Select
            value={form.urgencyLevel}
            onValueChange={(v) => setField("urgencyLevel", v as UrgencyLevel)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(URGENCY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>نوع پاسخ پیشنهادی</Label>
          <Select
            value={form.suggestedResponseType}
            onValueChange={(v) => setField("suggestedResponseType", v as ResponseType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RESPONSE_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>مهلت پاسخ (ساعت)</Label>
          <Input
            type="number"
            min={1}
            value={form.responseDeadlineHours}
            onChange={(e) => setField("responseDeadlineHours", e.target.value)}
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label>یادداشت کارشناسی</Label>
          <Textarea
            value={form.expertNotes}
            onChange={(e) => setField("expertNotes", e.target.value)}
            placeholder="نکات تحلیلی تیم رصد، زمینه خبر، یا هشدارهای ویژه..."
            rows={4}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={pending} onClick={() => submit("save")}>
          ذخیره
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => submit("submit_review")}>
          ارسال برای بررسی
        </Button>
        <Button disabled={pending} onClick={() => submit("convert_to_case")}>
          تبدیل به پرونده واکنش سریع
        </Button>
      </div>
    </div>
  );
}
