"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminHref, formatPersianNumber } from "@/lib/utils";
import {
  INGESTION_LABELS,
  ITEM_STATUS_LABELS,
  PLATFORM_LABELS,
  REVIEW_STATUS_LABELS,
  SENTIMENT_LABELS,
} from "@/lib/monitoring/labels";
import type { MediaSource, MonitoredItem, MonitoringOrganization } from "@/lib/monitoring/types";
import {
  ensureMonitoringReadyAction,
  getMonitoringLookupsAction,
  listMonitoredItemsAction,
  reviewMonitoredItemAction,
} from "@/lib/actions/monitoring-actions";
import {
  MonitoringEmptyState,
  RiskBadge,
  UrgencyBadge,
} from "@/components/admin/monitoring/monitoring-ui";

const TABS = [
  { id: "all", label: "همه" },
  { id: "negative", label: "خبرهای منفی" },
  { id: "trends", label: "ترندها" },
  { id: "needs_review", label: "نیازمند بررسی" },
  { id: "verified", label: "تأییدشده" },
  { id: "irrelevant", label: "نامرتبط" },
  { id: "converted", label: "تبدیل‌شده به پرونده" },
  { id: "archived", label: "آرشیوشده" },
] as const;

export function MonitoringFeedAdmin({ campaignId }: { campaignId: string }) {
  const [items, setItems] = useState<MonitoredItem[]>([]);
  const [total, setTotal] = useState(0);
  const [organizations, setOrganizations] = useState<MonitoringOrganization[]>([]);
  const [sources, setSources] = useState<MediaSource[]>([]);
  const [tab, setTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [organizationId, setOrganizationId] = useState<string>("all");
  const [platform, setPlatform] = useState<string>("all");
  const [sentiment, setSentiment] = useState<string>("all");
  const [ingestionType, setIngestionType] = useState<string>("all");
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      await ensureMonitoringReadyAction(campaignId);
      const lookups = await getMonitoringLookupsAction();
      if (lookups.success) {
        setOrganizations(lookups.organizations);
        setSources(lookups.sources);
      }
      if (tab === "trends") {
        setItems([]);
        setTotal(0);
        return;
      }
      const result = await listMonitoredItemsAction({
        campaignId,
        tab,
        search: search || undefined,
        organizationId: organizationId === "all" ? undefined : organizationId,
        platform: platform === "all" ? undefined : platform,
        sentiment: sentiment === "all" ? undefined : sentiment,
        ingestionType: ingestionType === "all" ? undefined : ingestionType,
        limit: 40,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setItems(result.items);
      setTotal(result.total);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, tab, organizationId, platform, sentiment, ingestionType]);

  const runReview = (id: string, decision: Parameters<typeof reviewMonitoredItemAction>[0]["decision"]) => {
    startTransition(async () => {
      const result = await reviewMonitoredItemAction({ id, decision });
      if (!result.success) toast.error(result.error);
      else {
        toast.success("وضعیت خبر به‌روزرسانی شد");
        load();
      }
    });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">جریان رصد</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            خروجی رصد خودکار و ثبت‌های دستی تیم رصد
          </p>
        </div>
        <Button asChild>
          <Link href={adminHref("/admin/monitoring/items/new", campaignId)}>ثبت دستی خبر</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-1 xl:col-span-2">
          <Label>جستجو</Label>
          <div className="flex gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="عنوان یا خلاصه..." />
            <Button variant="outline" onClick={load} disabled={pending}>
              اعمال
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label>سازمان</Label>
          <Select value={organizationId} onValueChange={setOrganizationId}>
            <SelectTrigger>
              <SelectValue placeholder="همه" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.shortName || org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>پلتفرم</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>احساسات</Label>
          <Select value={sentiment} onValueChange={setSentiment}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {Object.entries(SENTIMENT_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>نوع ورود</Label>
          <Select value={ingestionType} onValueChange={setIngestionType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              <SelectItem value="automatic">خودکار</SelectItem>
              <SelectItem value="manual">دستی</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {tab === "trends" ? (
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          برای مشاهده ترندها به صفحه{" "}
          <Link className="text-primary underline" href={adminHref("/admin/monitoring/trends", campaignId)}>
            ترندها
          </Link>{" "}
          بروید. منابع فعال: {formatPersianNumber(sources.length)}
        </div>
      ) : pending && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
      ) : items.length === 0 ? (
        <MonitoringEmptyState title="موردی یافت نشد" description="با فیلترهای فعلی خبری وجود ندارد." />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{formatPersianNumber(total)} مورد</p>
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{item.title}</h2>
                    <RiskBadge
                      level={
                        item.riskScore >= 75
                          ? "critical"
                          : item.riskScore >= 50
                            ? "high"
                            : item.riskScore >= 25
                              ? "medium"
                              : "low"
                      }
                    />
                    <UrgencyBadge level={item.urgencyLevel} />
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.summary}</p>
                  {item.ingestionType === "automatic" ? (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 inline-block">
                      این مورد به‌صورت خودکار توسط رصد هوشمند شناسایی شده است.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{item.organizationName}</span>
                    <span>{item.sourceName ?? "منبع نامشخص"}</span>
                    <span>{PLATFORM_LABELS[item.platform] ?? item.platform}</span>
                    <span>بازدید {formatPersianNumber(item.viewCount)}</span>
                    <span>تعامل {formatPersianNumber(item.engagementCount)}</span>
                    <span>رشد {formatPersianNumber(item.growthRate)}٪</span>
                    <span>{SENTIMENT_LABELS[item.sentiment]}</span>
                    <span>ریسک {formatPersianNumber(item.riskScore)}</span>
                    <span>{INGESTION_LABELS[item.ingestionType]}</span>
                    <span>{REVIEW_STATUS_LABELS[item.reviewStatus]}</span>
                    <span>{ITEM_STATUS_LABELS[item.status]}</span>
                    {item.matchedKeyword ? <span>کلیدواژه: {item.matchedKeyword}</span> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={adminHref(`/admin/monitoring/items/${item.id}`, campaignId)}>جزئیات</Link>
                  </Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => runReview(item.id, "approve")}>
                    تأیید
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => runReview(item.id, "reject_irrelevant")}
                  >
                    نامرتبط
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => runReview(item.id, "mark_duplicate")}
                  >
                    تکراری
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => runReview(item.id, "continue_monitoring")}
                  >
                    ادامه رصد
                  </Button>
                  <Button asChild size="sm">
                    <Link href={adminHref(`/admin/monitoring/items/${item.id}?convert=1`, campaignId)}>
                      تبدیل به پرونده
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => runReview(item.id, "archive")}>
                    بانک خبر
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
