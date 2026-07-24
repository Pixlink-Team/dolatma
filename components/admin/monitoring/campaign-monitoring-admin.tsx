"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
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
import { adminHref, formatPersianNumber } from "@/lib/utils";
import { SENTIMENT_LABELS } from "@/lib/monitoring/labels";
import type { CampaignMonitoringBundle, CampaignMonitoringSettings } from "@/lib/monitoring/types";
import {
  ensureMonitoringReadyAction,
  getCampaignMonitoringAction,
  updateCampaignMonitoringSettingsAction,
} from "@/lib/actions/monitoring-actions";
import {
  MonitoringEmptyState,
  MonitoringSection,
  MonitoringStatCard,
} from "@/components/admin/monitoring/monitoring-ui";

function joinList(values: string[]): string {
  return values.join("\n");
}

function splitList(text: string): string[] {
  return text
    .split(/[\n,،]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CampaignMonitoringAdmin({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<CampaignMonitoringBundle | null>(null);
  const [edit, setEdit] = useState({
    keywords: "",
    hashtags: "",
    slogans: "",
    spokespersonNames: "",
    organizationNames: "",
    targetPlatforms: "",
    targetProvinces: "",
    targetAudience: "",
    competitorNarratives: "",
    negativeKeywords: "",
    baselinePeriodDays: "7",
    monitoringStatus: "active" as CampaignMonitoringSettings["monitoringStatus"],
    startDate: "",
    endDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const applySettingsToForm = (settings: CampaignMonitoringSettings) => {
    setEdit({
      keywords: joinList(settings.keywords),
      hashtags: joinList(settings.hashtags),
      slogans: joinList(settings.slogans),
      spokespersonNames: joinList(settings.spokespersonNames),
      organizationNames: joinList(settings.organizationNames),
      targetPlatforms: joinList(settings.targetPlatforms),
      targetProvinces: joinList(settings.targetProvinces),
      targetAudience: settings.targetAudience ?? "",
      competitorNarratives: joinList(settings.competitorNarratives),
      negativeKeywords: joinList(settings.negativeKeywords),
      baselinePeriodDays: String(settings.baselinePeriodDays),
      monitoringStatus: settings.monitoringStatus,
      startDate: settings.startDate ? settings.startDate.slice(0, 16) : "",
      endDate: settings.endDate ? settings.endDate.slice(0, 16) : "",
    });
  };

  const load = () => {
    startTransition(async () => {
      setLoading(true);
      await ensureMonitoringReadyAction(campaignId);
      const result = await getCampaignMonitoringAction(campaignId);
      if (!result.success) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      setData(result.data);
      applySettingsToForm(result.data.settings);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const saveSettings = () => {
    startTransition(async () => {
      const result = await updateCampaignMonitoringSettingsAction(campaignId, {
        keywords: splitList(edit.keywords),
        hashtags: splitList(edit.hashtags),
        slogans: splitList(edit.slogans),
        spokespersonNames: splitList(edit.spokespersonNames),
        organizationNames: splitList(edit.organizationNames),
        targetPlatforms: splitList(edit.targetPlatforms),
        targetProvinces: splitList(edit.targetProvinces),
        targetAudience: edit.targetAudience.trim() || null,
        competitorNarratives: splitList(edit.competitorNarratives),
        negativeKeywords: splitList(edit.negativeKeywords),
        baselinePeriodDays: Number(edit.baselinePeriodDays) || 7,
        monitoringStatus: edit.monitoringStatus,
        startDate: edit.startDate ? new Date(edit.startDate).toISOString() : null,
        endDate: edit.endDate ? new Date(edit.endDate).toISOString() : null,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("تنظیمات رصد کمپین ذخیره شد");
      load();
    });
  };

  if (loading && !data) {
    return <div className="p-6 text-sm text-muted-foreground">در حال بارگذاری رصد کمپین...</div>;
  }

  if (!data) {
    return (
      <div className="p-6">
        <MonitoringEmptyState
          title="رصد کمپین در دسترس نیست"
          description="امکان دریافت داده رصد این کمپین وجود ندارد."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">رصد کمپین</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مقایسه دوره قبل، حین و بعد از کمپین به‌همراه تنظیمات رصد
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={pending}>
            به‌روزرسانی
          </Button>
          <Button asChild variant="outline">
            <Link href={adminHref("/admin/monitoring/dashboard", campaignId)}>داشبورد رصد</Link>
          </Button>
        </div>
      </div>

      <MonitoringSection title="قبل از کمپین (Baseline)">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MonitoringStatCard label="حجم گفتگو" value={data.before.conversationVolume} />
          <MonitoringStatCard
            label="احساسات پایه"
            value={SENTIMENT_LABELS[data.before.baselineSentiment]}
          />
          <MonitoringStatCard
            label="آگاهی"
            value={`${formatPersianNumber(data.before.awarenessScore)}٪`}
          />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border p-4 text-sm">
            <p className="font-medium mb-2">موضوعات حساس</p>
            {data.before.sensitiveTopics.length === 0 ? (
              <p className="text-muted-foreground">موردی نیست</p>
            ) : (
              <ul className="list-disc pr-5 space-y-1">
                {data.before.sensitiveTopics.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border p-4 text-sm">
            <p className="font-medium mb-2">روایت‌های موجود</p>
            {data.before.existingNarratives.length === 0 ? (
              <p className="text-muted-foreground">موردی نیست</p>
            ) : (
              <ul className="list-disc pr-5 space-y-1">
                {data.before.existingNarratives.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </MonitoringSection>

      <MonitoringSection title="حین کمپین">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MonitoringStatCard label="دسترسی" value={data.during.reach} />
          <MonitoringStatCard label="اشارات" value={data.during.mentions} />
          <MonitoringStatCard label="تعامل" value={data.during.engagement} />
          <MonitoringStatCard label="احساسات" value={SENTIMENT_LABELS[data.during.sentiment]} />
          <MonitoringStatCard label="هشدارها" value={data.during.alerts} tone="warning" />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="rounded-xl border p-4 text-sm">
            <p className="font-medium mb-2">هشتگ‌های برتر</p>
            {data.during.topHashtags.map((h) => (
              <div key={h.tag} className="flex justify-between py-1">
                <span>{h.tag}</span>
                <span>{formatPersianNumber(h.count)}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border p-4 text-sm">
            <p className="font-medium mb-2">منابع برتر</p>
            {data.during.topSources.map((s) => (
              <div key={s.name} className="flex justify-between py-1">
                <span>{s.name}</span>
                <span>{formatPersianNumber(s.count)}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border p-4 text-sm">
            <p className="font-medium mb-2">استان‌های برتر</p>
            {data.during.topProvinces.length === 0 ? (
              <p className="text-muted-foreground">موردی نیست</p>
            ) : (
              data.during.topProvinces.map((p) => (
                <div key={p.name} className="flex justify-between py-1">
                  <span>{p.name}</span>
                  <span>{formatPersianNumber(p.count)}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">اخبار منفی مرتبط</p>
          {data.during.negativeNews.length === 0 ? (
            <MonitoringEmptyState
              title="خبر منفی نیست"
              description="در دوره جاری خبر منفی ثبت نشده است."
            />
          ) : (
            data.during.negativeNews.map((item) => (
              <Link
                key={item.id}
                href={adminHref(`/admin/monitoring/items/${item.id}`, campaignId)}
                className="block rounded-xl border p-3 hover:bg-muted/40"
              >
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{item.summary}</p>
              </Link>
            ))
          )}
        </div>
      </MonitoringSection>

      <MonitoringSection title="پس از کمپین">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MonitoringStatCard
            label="تغییر احساسات"
            value={`${formatPersianNumber(data.after.sentimentChange)}٪`}
            tone="success"
          />
          <MonitoringStatCard
            label="تغییر حجم"
            value={`${formatPersianNumber(data.after.volumeChange)}٪`}
          />
          <MonitoringStatCard
            label="تحقق KPI"
            value={`${formatPersianNumber(data.after.kpiAchievement)}٪`}
          />
        </div>
        <div className="mt-3 rounded-xl border p-4 text-sm space-y-2">
          <p>بهترین محتوا: {data.after.bestContent ?? "—"}</p>
          <p>بهترین کانال: {data.after.bestChannel ?? "—"}</p>
          <p>بهترین سازمان: {data.after.bestOrganization ?? "—"}</p>
          <p className="text-muted-foreground">{data.after.aiAnalysis}</p>
          <div>
            <p className="font-medium mb-1">ضعف‌ها</p>
            <ul className="list-disc pr-5 space-y-1">
              {data.after.weaknesses.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium mb-1">پیشنهاد کمپین بعدی</p>
            <ul className="list-disc pr-5 space-y-1">
              {data.after.nextCampaignSuggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </MonitoringSection>

      <MonitoringSection title="ویرایش تنظیمات رصد کمپین">
        <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-2">
          {(
            [
              ["keywords", "کلیدواژه‌ها", edit.keywords],
              ["hashtags", "هشتگ‌ها", edit.hashtags],
              ["slogans", "شعارها", edit.slogans],
              ["spokespersonNames", "سخنگویان", edit.spokespersonNames],
              ["organizationNames", "سازمان‌ها", edit.organizationNames],
              ["targetPlatforms", "پلتفرم‌های هدف", edit.targetPlatforms],
              ["targetProvinces", "استان‌های هدف", edit.targetProvinces],
              ["competitorNarratives", "روایت رقبا", edit.competitorNarratives],
              ["negativeKeywords", "کلیدواژه‌های منفی", edit.negativeKeywords],
            ] as const
          ).map(([key, label, value]) => (
            <div key={key} className="space-y-1">
              <Label>{label}</Label>
              <Textarea
                value={value}
                onChange={(e) => setEdit((p) => ({ ...p, [key]: e.target.value }))}
                rows={3}
                placeholder="هر مورد در یک خط"
              />
            </div>
          ))}
          <div className="space-y-1 md:col-span-2">
            <Label>مخاطب هدف</Label>
            <Input
              value={edit.targetAudience}
              onChange={(e) => setEdit((p) => ({ ...p, targetAudience: e.target.value }))}
              placeholder="مثلاً: شهروندان استان‌های هدف"
            />
          </div>
          <div className="space-y-1">
            <Label>روزهای دوره پایه</Label>
            <Input
              type="number"
              min={1}
              value={edit.baselinePeriodDays}
              onChange={(e) => setEdit((p) => ({ ...p, baselinePeriodDays: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>وضعیت رصد</Label>
            <Select
              value={edit.monitoringStatus}
              onValueChange={(v) =>
                setEdit((p) => ({
                  ...p,
                  monitoringStatus: v as CampaignMonitoringSettings["monitoringStatus"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">پیش‌نویس</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="paused">متوقف</SelectItem>
                <SelectItem value="completed">تکمیل‌شده</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>شروع</Label>
            <Input
              type="datetime-local"
              value={edit.startDate}
              onChange={(e) => setEdit((p) => ({ ...p, startDate: e.target.value }))}
              dir="ltr"
              className="text-left"
            />
          </div>
          <div className="space-y-1">
            <Label>پایان</Label>
            <Input
              type="datetime-local"
              value={edit.endDate}
              onChange={(e) => setEdit((p) => ({ ...p, endDate: e.target.value }))}
              dir="ltr"
              className="text-left"
            />
          </div>
          <div className="md:col-span-2">
            <Button disabled={pending} onClick={saveSettings}>
              ذخیره تنظیمات
            </Button>
          </div>
        </div>
      </MonitoringSection>
    </div>
  );
}
