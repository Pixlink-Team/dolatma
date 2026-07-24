"use client";

import { useEffect, useState, useTransition } from "react";
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
import { formatPersianNumber } from "@/lib/utils";
import { DEFAULT_MONITORING_SETTINGS } from "@/lib/monitoring/defaults";
import type { MonitoringSystemSettings } from "@/lib/monitoring/types";
import {
  ensureMonitoringReadyAction,
  getMonitoringLookupsAction,
  runMonitoringIngestionAction,
  saveMonitoringSettingsAction,
} from "@/lib/actions/monitoring-actions";
import {
  MonitoringEmptyState,
  MonitoringSection,
} from "@/components/admin/monitoring/monitoring-ui";

function stringifyRecipients(settings: MonitoringSystemSettings): string {
  return settings.smsRecipients
    .map((r) => `${r.name}|${r.phone}|${r.role}`)
    .join("\n");
}

function parseRecipients(text: string): MonitoringSystemSettings["smsRecipients"] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", phone = "", role = "shift_officer"] = line.split("|").map((s) => s.trim());
      return { name, phone, role };
    })
    .filter((r) => r.name && r.phone);
}

export function MonitoringSettingsAdmin({ campaignId }: { campaignId: string }) {
  const [settings, setSettings] = useState<MonitoringSystemSettings | null>(null);
  const [recipientsText, setRecipientsText] = useState("");
  const [orgCount, setOrgCount] = useState(0);
  const [sourceCount, setSourceCount] = useState(0);
  const [keywordCount, setKeywordCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      setLoading(true);
      await ensureMonitoringReadyAction(campaignId);
      const lookups = await getMonitoringLookupsAction();
      if (!lookups.success) {
        toast.error(lookups.error);
        setLoading(false);
        return;
      }
      const next = lookups.settings ?? DEFAULT_MONITORING_SETTINGS;
      setSettings(next);
      setRecipientsText(stringifyRecipients(next));
      setOrgCount(lookups.organizations.length);
      setSourceCount(lookups.sources.length);
      setKeywordCount(lookups.keywords.length);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const patch = <K extends keyof MonitoringSystemSettings>(
    key: K,
    value: MonitoringSystemSettings[K]
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = () => {
    if (!settings) return;
    startTransition(async () => {
      const payload: MonitoringSystemSettings = {
        ...settings,
        smsRecipients: parseRecipients(recipientsText),
      };
      const result = await saveMonitoringSettingsAction(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setSettings(result.settings);
      setRecipientsText(stringifyRecipients(result.settings));
      toast.success("تنظیمات ذخیره شد");
    });
  };

  const runIngestion = () => {
    startTransition(async () => {
      const result = await runMonitoringIngestionAction();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `رصد خودکار اجرا شد — موارد جدید: ${formatPersianNumber(result.inserted)}`
      );
      load();
    });
  };

  if (loading && !settings) {
    return <div className="p-6 text-sm text-muted-foreground">در حال بارگذاری تنظیمات...</div>;
  }

  if (!settings) {
    return (
      <div className="p-6">
        <MonitoringEmptyState
          title="تنظیمات در دسترس نیست"
          description="امکان دریافت تنظیمات رصد وجود ندارد."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">تنظیمات رصد</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            آستانه‌ها، ارائه‌دهنده داده، اعلان‌ها و اجرای رصد خودکار
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={pending} onClick={runIngestion}>
            اجرای رصد اکنون
          </Button>
          <Button disabled={pending} onClick={save}>
            ذخیره تنظیمات
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">سازمان‌ها</p>
          <p className="mt-1 text-xl font-bold">{formatPersianNumber(orgCount)}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">منابع رسانه</p>
          <p className="mt-1 text-xl font-bold">{formatPersianNumber(sourceCount)}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">کلیدواژه‌ها</p>
          <p className="mt-1 text-xl font-bold">{formatPersianNumber(keywordCount)}</p>
        </div>
      </div>

      <MonitoringSection title="ارائه‌دهنده و زمان‌بندی">
        <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>ارائه‌دهنده رصد</Label>
            <Select
              value={settings.providerId}
              onValueChange={(v) =>
                patch("providerId", v as MonitoringSystemSettings["providerId"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mock">نمونه (Mock)</SelectItem>
                <SelectItem value="manual">فقط دستی</SelectItem>
                <SelectItem value="daytac">Daytac</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>فاصله پولینگ (دقیقه)</Label>
            <Input
              type="number"
              min={1}
              value={settings.pollingIntervalMinutes}
              onChange={(e) => patch("pollingIntervalMinutes", Number(e.target.value) || 15)}
            />
          </div>
          <div className="space-y-1">
            <Label>پنجره تشخیص تکراری (ساعت)</Label>
            <Input
              type="number"
              min={1}
              value={settings.duplicateWindowHours}
              onChange={(e) => patch("duplicateWindowHours", Number(e.target.value) || 24)}
            />
          </div>
          <div className="space-y-1">
            <Label>Cron زمان‌بندی</Label>
            <Input
              value={settings.scheduleCron}
              onChange={(e) => patch("scheduleCron", e.target.value)}
              dir="ltr"
              className="text-left"
              placeholder="*/15 * * * *"
            />
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={settings.aiEnabled}
              onChange={(e) => patch("aiEnabled", e.target.checked)}
            />
            فعال‌سازی تحلیل هوش مصنوعی
          </label>
        </div>
      </MonitoringSection>

      <MonitoringSection title="آستانه‌های هشدار ریسک">
        <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>متوسط</Label>
            <Input
              type="number"
              value={settings.alertThresholds.medium}
              onChange={(e) =>
                patch("alertThresholds", {
                  ...settings.alertThresholds,
                  medium: Number(e.target.value) || 0,
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>بالا</Label>
            <Input
              type="number"
              value={settings.alertThresholds.high}
              onChange={(e) =>
                patch("alertThresholds", {
                  ...settings.alertThresholds,
                  high: Number(e.target.value) || 0,
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>بحرانی</Label>
            <Input
              type="number"
              value={settings.alertThresholds.critical}
              onChange={(e) =>
                patch("alertThresholds", {
                  ...settings.alertThresholds,
                  critical: Number(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>
      </MonitoringSection>

      <MonitoringSection
        title="گیرندگان پیامک"
        description="هر خط: نام|شماره|نقش"
      >
        <Textarea
          value={recipientsText}
          onChange={(e) => setRecipientsText(e.target.value)}
          rows={6}
          dir="ltr"
          className="text-left font-mono text-xs"
          placeholder="مسئول شیفت|0912...|shift_officer"
        />
      </MonitoringSection>
    </div>
  );
}
