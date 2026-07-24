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
import {
  getDirectiveMonitoringAction,
  updateDirectiveMonitoringSettingsAction,
} from "@/lib/actions/monitoring-actions";
import type { DirectiveMonitoringSettings, MonitoredItem } from "@/lib/monitoring/types";

export function DirectiveMonitoringPanel({
  campaignId,
  directiveId,
}: {
  campaignId: string;
  directiveId: string;
}) {
  const [settings, setSettings] = useState<DirectiveMonitoringSettings | null>(null);
  const [items, setItems] = useState<MonitoredItem[]>([]);
  const [keywordsText, setKeywordsText] = useState("");
  const [negativeText, setNegativeText] = useState("");
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      const result = await getDirectiveMonitoringAction(directiveId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setSettings(result.settings);
      setItems(result.items);
      setKeywordsText(result.settings.keywords.join("، "));
      setNegativeText(result.settings.negativeKeywords.join("، "));
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directiveId]);

  if (!settings) {
    return <p className="text-sm text-muted-foreground">در حال بارگذاری رصد دستورکار...</p>;
  }

  return (
    <div className="space-y-6 rounded-xl border bg-card p-4">
      <div>
        <h2 className="text-base font-semibold">رصد دستورکار</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          تنظیم دامنه رصد و مشاهده اخبار مرتبط با این دستورکار
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>نوع رصد</Label>
          <Select
            value={settings.monitoringKind}
            onValueChange={(value) =>
              setSettings({
                ...settings,
                monitoringKind: value as DirectiveMonitoringSettings["monitoringKind"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="campaign">رصد کمپین</SelectItem>
              <SelectItem value="crisis">رصد بحران</SelectItem>
              <SelectItem value="event">رصد رویداد</SelectItem>
              <SelectItem value="policy">رصد بازخورد سیاست</SelectItem>
              <SelectItem value="announcement">رصد بازتاب اطلاعیه</SelectItem>
              <SelectItem value="other">سایر</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>وضعیت رصد</Label>
          <Select
            value={settings.monitoringStatus}
            onValueChange={(value) =>
              setSettings({
                ...settings,
                monitoringStatus: value as DirectiveMonitoringSettings["monitoringStatus"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">پیش‌نویس</SelectItem>
              <SelectItem value="active">فعال</SelectItem>
              <SelectItem value="paused">متوقف</SelectItem>
              <SelectItem value="completed">پایان‌یافته</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>کلیدواژه‌ها (با ویرگول)</Label>
          <Textarea value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>کلیدواژه‌های منفی</Label>
          <Input value={negativeText} onChange={(e) => setNegativeText(e.target.value)} />
        </div>
      </div>

      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await updateDirectiveMonitoringSettingsAction(directiveId, {
              monitoringKind: settings.monitoringKind,
              monitoringStatus: settings.monitoringStatus,
              keywords: keywordsText
                .split(/[،,]/)
                .map((s) => s.trim())
                .filter(Boolean),
              negativeKeywords: negativeText
                .split(/[،,]/)
                .map((s) => s.trim())
                .filter(Boolean),
            });
            if (!result.success) toast.error(result.error);
            else toast.success("تنظیمات رصد ذخیره شد");
          })
        }
      >
        ذخیره تنظیمات رصد
      </Button>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">اخبار مرتبط ({formatPersianNumber(items.length)})</h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز خبر مرتبطی ثبت نشده است.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{item.title}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={adminHref(`/admin/monitoring/items/${item.id}`, campaignId)}>جزئیات</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={adminHref(`/admin/monitoring/items/${item.id}?convert=1`, campaignId)}>
                    تبدیل به پرونده
                  </Link>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
