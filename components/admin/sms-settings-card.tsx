"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutoSaveStatusIndicator } from "@/components/admin/auto-save-status";
import { getSmsSettingsAction, saveSmsSettingsAction } from "@/lib/actions/sms-actions";
import { useAutoSave } from "@/lib/hooks/use-auto-save";
import type { SmsProviderId, SmsProviderSettingsPublic } from "@/lib/types";

const schema = z.object({
  enabled: z.boolean(),
  provider: z.enum(["none", "smsir", "kavenegar", "melipayamak", "custom"]),
  apiKey: z.string().optional(),
  sender: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const providerLabels: Record<SmsProviderId, string> = {
  none: "بدون ارائه‌دهنده",
  smsir: "sms.ir",
  kavenegar: "کاوه نگار",
  melipayamak: "ملی پیامک",
  custom: "سفارشی",
};

const senderPlaceholders: Partial<Record<SmsProviderId, string>> = {
  smsir: "مثلاً 30007732000000",
  kavenegar: "مثلاً 1000xxxx",
  melipayamak: "مثلاً 5000xxxx",
};

const apiKeyHelpText: Partial<Record<SmsProviderId, string>> = {
  smsir:
    "کلید خصوصی پنل برنامه‌نویسان sms.ir را وارد کنید. در درخواست‌ها با هدر X-API-KEY ارسال می‌شود.",
};

export function SmsSettingsCard() {
  const [ready, setReady] = useState(false);
  const [publicSettings, setPublicSettings] = useState<SmsProviderSettingsPublic | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      enabled: false,
      provider: "none",
      apiKey: "",
      sender: "",
    },
  });

  const provider = form.watch("provider");
  const formValues = form.watch();
  const autoSaveSnapshot = {
    enabled: formValues.enabled,
    provider: formValues.provider,
    sender: formValues.sender,
  };

  const persistSettings = useCallback(async (): Promise<boolean> => {
    const data = form.getValues();
    const result = await saveSmsSettingsAction({
      enabled: data.enabled,
      provider: data.provider,
      apiKey: data.apiKey || undefined,
      sender: data.sender,
    });

    if (!result.success) {
      toast.error(result.error ?? "ذخیره تنظیمات پیامک ناموفق بود");
      return false;
    }

    const refreshed = await getSmsSettingsAction();
    if (refreshed) setPublicSettings(refreshed);
    form.setValue("apiKey", "");
    return true;
  }, [form]);

  const { status: saveStatus, markSaved } = useAutoSave({
    value: autoSaveSnapshot,
    onSave: persistSettings,
    skip: !ready,
  });

  const saveApiKeyOnBlur = async () => {
    const apiKey = form.getValues("apiKey")?.trim();
    if (!apiKey) return;
    const ok = await persistSettings();
    if (ok) {
      markSaved(autoSaveSnapshot);
    }
  };

  useEffect(() => {
    getSmsSettingsAction().then((settings) => {
      if (!settings) return;
      setPublicSettings(settings);
      const initial: FormData = {
        enabled: settings.enabled,
        provider: settings.provider,
        apiKey: "",
        sender: settings.sender,
      };
      form.reset(initial);
      markSaved({
        enabled: initial.enabled,
        provider: initial.provider,
        sender: initial.sender,
      });
      setReady(true);
    });
  }, [form, markSaved]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">تنظیمات پیامک (SMS)</CardTitle>
            {publicSettings?.configured ? (
              <Badge variant="success">فعال</Badge>
            ) : (
              <Badge variant="warning">غیرفعال</Badge>
            )}
          </div>
          <AutoSaveStatusIndicator status={saveStatus} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            برای ارسال پیامک هنگام انتشار دستورکار، ارائه‌دهنده و کلید API را تنظیم کنید.
            این تنظیمات سراسری است و برای همه راستاها اعمال می‌شود.
          </p>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <Label className="font-medium">فعال‌سازی ارسال پیامک</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                در صورت خاموش بودن، دستورکارها بدون پیامک منتشر می‌شوند.
              </p>
            </div>
            <Switch
              checked={form.watch("enabled")}
              onCheckedChange={(value) => form.setValue("enabled", value)}
              disabled={provider === "none"}
            />
          </div>

          <div className="space-y-2">
            <Label>ارائه‌دهنده</Label>
            <Select
              value={provider}
              onValueChange={(value) => {
                const next = value as SmsProviderId;
                form.setValue("provider", next);
                if (next === "none") {
                  form.setValue("enabled", false);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="انتخاب ارائه‌دهنده" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(providerLabels) as SmsProviderId[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {providerLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>شماره فرستنده / خط</Label>
            <Input
              {...form.register("sender")}
              dir="ltr"
              placeholder={senderPlaceholders[provider] ?? "مثلاً 1000xxxx"}
              className="text-left"
            />
            {provider === "smsir" && (
              <p className="text-xs text-muted-foreground">
                برای sms.ir شماره خط ارسال (lineNumber) از پنل کاربری را وارد کنید.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>کلید API</Label>
            <Input
              type="password"
              {...form.register("apiKey", {
                onBlur: () => {
                  void saveApiKeyOnBlur();
                },
              })}
              dir="ltr"
              autoComplete="new-password"
              placeholder={
                publicSettings?.hasApiKey
                  ? "•••••••• (برای تغییر وارد کنید)"
                  : provider === "smsir"
                    ? "X-API-KEY"
                    : "API Key ارائه‌دهنده"
              }
              className="text-left"
            />
            <p className="text-xs text-muted-foreground">
              {apiKeyHelpText[provider] ??
                "کلید ذخیره می‌شود و در رابط کاربری دوباره نمایش داده نمی‌شود."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
