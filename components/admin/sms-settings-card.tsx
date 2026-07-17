"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSmsSettingsAction, saveSmsSettingsAction } from "@/lib/actions/sms-actions";
import type { SmsProviderId, SmsProviderSettingsPublic } from "@/lib/types";

const schema = z.object({
  enabled: z.boolean(),
  provider: z.enum(["none", "kavenegar", "melipayamak", "custom"]),
  apiKey: z.string().optional(),
  sender: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const providerLabels: Record<SmsProviderId, string> = {
  none: "بدون ارائه‌دهنده",
  kavenegar: "کاوه نگار",
  melipayamak: "ملی پیامک",
  custom: "سفارشی",
};

export function SmsSettingsCard() {
  const [isPending, startTransition] = useTransition();
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

  useEffect(() => {
    getSmsSettingsAction().then((settings) => {
      if (!settings) return;
      setPublicSettings(settings);
      form.reset({
        enabled: settings.enabled,
        provider: settings.provider,
        apiKey: "",
        sender: settings.sender,
      });
    });
  }, [form]);

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const result = await saveSmsSettingsAction({
        enabled: data.enabled,
        provider: data.provider,
        apiKey: data.apiKey || undefined,
        sender: data.sender,
      });

      if (!result.success) {
        toast.error(result.error ?? "ذخیره تنظیمات پیامک ناموفق بود");
        return;
      }

      const refreshed = await getSmsSettingsAction();
      if (refreshed) setPublicSettings(refreshed);
      form.setValue("apiKey", "");
      toast.success("تنظیمات پیامک ذخیره شد");
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">تنظیمات پیامک (SMS)</CardTitle>
          {publicSettings?.configured ? (
            <Badge variant="success">فعال</Badge>
          ) : (
            <Badge variant="warning">غیرفعال</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            برای ارسال پیامک هنگام انتشار دستورکار، ارائه‌دهنده و کلید API را تنظیم کنید.
            این تنظیمات سراسری است و برای همه کمپین‌ها اعمال می‌شود.
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
              placeholder="مثلاً 1000xxxx"
              className="text-left"
            />
          </div>

          <div className="space-y-2">
            <Label>کلید API</Label>
            <Input
              type="password"
              {...form.register("apiKey")}
              dir="ltr"
              autoComplete="new-password"
              placeholder={
                publicSettings?.hasApiKey
                  ? "•••••••• (برای تغییر وارد کنید)"
                  : "API Key ارائه‌دهنده"
              }
              className="text-left"
            />
            <p className="text-xs text-muted-foreground">
              کلید ذخیره می‌شود و در رابط کاربری دوباره نمایش داده نمی‌شود.
            </p>
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "در حال ذخیره..." : "ذخیره تنظیمات پیامک"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
