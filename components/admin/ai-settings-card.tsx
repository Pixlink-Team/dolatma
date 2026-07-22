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
import {
  getAiSettingsAction,
  saveAiSettingsAction,
  testAiConnectionAction,
} from "@/lib/actions/ai-settings-actions";
import {
  AI_FEATURE_IDS,
  AI_FEATURE_LABELS,
  type AiFeatureId,
  type AiProviderId,
  type AiSettingsPublic,
} from "@/lib/ai/settings";
import { formatPersianNumber } from "@/lib/utils";

const providerSchema = z.enum(["openai", "gemini"]);

const schema = z.object({
  enabled: z.boolean(),
  defaultProvider: providerSchema,
  openaiModel: z.string(),
  openaiBaseUrl: z.string().optional(),
  openaiApiKey: z.string().optional(),
  geminiModel: z.string(),
  geminiBaseUrl: z.string().optional(),
  geminiApiKey: z.string().optional(),
  featureProviders: z.record(providerSchema),
  dailyTokenLimit: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const providerLabels: Record<AiProviderId, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
};

function parseDailyLimit(value: string | undefined): number | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

export function AiSettingsCard() {
  const [isPending, startTransition] = useTransition();
  const [testingProvider, setTestingProvider] = useState<AiProviderId | null>(null);
  const [publicSettings, setPublicSettings] = useState<AiSettingsPublic | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      enabled: false,
      defaultProvider: "openai",
      openaiModel: "gpt-4o-mini",
      openaiBaseUrl: "",
      openaiApiKey: "",
      geminiModel: "gemini-2.0-flash",
      geminiBaseUrl: "",
      geminiApiKey: "",
      featureProviders: Object.fromEntries(
        AI_FEATURE_IDS.map((id) => [id, "openai" as AiProviderId])
      ) as Record<AiFeatureId, AiProviderId>,
      dailyTokenLimit: "",
    },
  });

  useEffect(() => {
    getAiSettingsAction().then((settings) => {
      if (!settings) return;
      setPublicSettings(settings);
      form.reset({
        enabled: settings.enabled,
        defaultProvider: settings.defaultProvider,
        openaiModel: settings.openai.model,
        openaiBaseUrl: settings.openai.baseUrl,
        openaiApiKey: "",
        geminiModel: settings.gemini.model,
        geminiBaseUrl: settings.gemini.baseUrl,
        geminiApiKey: "",
        featureProviders: { ...settings.featureProviders },
        dailyTokenLimit:
          settings.dailyTokenLimit != null ? String(settings.dailyTokenLimit) : "",
      });
    });
  }, [form]);

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const result = await saveAiSettingsAction({
        enabled: data.enabled,
        defaultProvider: data.defaultProvider,
        openai: {
          model: data.openaiModel,
          baseUrl: data.openaiBaseUrl?.trim() || null,
          apiKey: data.openaiApiKey || undefined,
        },
        gemini: {
          model: data.geminiModel,
          baseUrl: data.geminiBaseUrl?.trim() || null,
          apiKey: data.geminiApiKey || undefined,
        },
        featureProviders: data.featureProviders as Record<AiFeatureId, AiProviderId>,
        dailyTokenLimit: parseDailyLimit(data.dailyTokenLimit),
      });

      if (!result.success) {
        toast.error(result.error ?? "ذخیره تنظیمات هوش مصنوعی ناموفق بود");
        return;
      }

      const refreshed = await getAiSettingsAction();
      if (refreshed) {
        setPublicSettings(refreshed);
        form.setValue("openaiApiKey", "");
        form.setValue("geminiApiKey", "");
      }
      toast.success("تنظیمات هوش مصنوعی ذخیره شد");
    });
  };

  const testConnection = (provider: AiProviderId) => {
    setTestingProvider(provider);
    startTransition(async () => {
      const result = await testAiConnectionAction(provider);
      setTestingProvider(null);
      if (!result.ok) {
        toast.error(result.error ?? "تست اتصال ناموفق بود");
        return;
      }
      toast.success(
        result.model
          ? `اتصال ${providerLabels[provider]} موفق بود (${result.model})`
          : `اتصال ${providerLabels[provider]} موفق بود`
      );
      const refreshed = await getAiSettingsAction();
      if (refreshed) setPublicSettings(refreshed);
    });
  };

  const usageLabel = (() => {
    if (!publicSettings) return "—";
    const used = formatPersianNumber(publicSettings.usageTokens);
    if (publicSettings.dailyTokenLimit == null) {
      return `${used} توکن امروز (بدون سقف)`;
    }
    return `${used} / ${formatPersianNumber(publicSettings.dailyTokenLimit)} توکن امروز`;
  })();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">تنظیمات هوش مصنوعی</CardTitle>
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
            ارائه‌دهنده، مدل و کلید API را برای قابلیت‌های هوش مصنوعی تنظیم کنید.
            کلیدها رمزنگاری می‌شوند و در رابط کاربری دوباره نمایش داده نمی‌شوند.
          </p>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <Label className="font-medium">فعال‌سازی هوش مصنوعی</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                در صورت خاموش بودن، هیچ قابلیت AI فراخوانی نمی‌شود.
              </p>
            </div>
            <Switch
              checked={form.watch("enabled")}
              onCheckedChange={(value) => form.setValue("enabled", value)}
            />
          </div>

          <div className="space-y-2">
            <Label>ارائه‌دهنده پیش‌فرض</Label>
            <Select
              value={form.watch("defaultProvider")}
              onValueChange={(value) =>
                form.setValue("defaultProvider", value as AiProviderId)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="انتخاب ارائه‌دهنده" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(providerLabels) as AiProviderId[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {providerLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="font-medium">OpenAI</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending || testingProvider !== null}
                onClick={() => testConnection("openai")}
              >
                {testingProvider === "openai" ? "در حال تست..." : "تست اتصال"}
              </Button>
            </div>
            <div className="space-y-2">
              <Label>مدل</Label>
              <Input
                {...form.register("openaiModel")}
                dir="ltr"
                placeholder="gpt-4o-mini"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label>آدرس پایه (اختیاری)</Label>
              <Input
                {...form.register("openaiBaseUrl")}
                dir="ltr"
                placeholder="https://api.openai.com/v1"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label>کلید API</Label>
              <Input
                type="password"
                {...form.register("openaiApiKey")}
                dir="ltr"
                autoComplete="new-password"
                placeholder={
                  publicSettings?.openai.hasApiKey
                    ? "•••••••• (برای تغییر وارد کنید)"
                    : "sk-..."
                }
                className="text-left"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="font-medium">Gemini</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending || testingProvider !== null}
                onClick={() => testConnection("gemini")}
              >
                {testingProvider === "gemini" ? "در حال تست..." : "تست اتصال"}
              </Button>
            </div>
            <div className="space-y-2">
              <Label>مدل</Label>
              <Input
                {...form.register("geminiModel")}
                dir="ltr"
                placeholder="gemini-2.0-flash"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label>آدرس پایه (اختیاری)</Label>
              <Input
                {...form.register("geminiBaseUrl")}
                dir="ltr"
                placeholder="https://generativelanguage.googleapis.com/v1beta"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label>کلید API</Label>
              <Input
                type="password"
                {...form.register("geminiApiKey")}
                dir="ltr"
                autoComplete="new-password"
                placeholder={
                  publicSettings?.gemini.hasApiKey
                    ? "•••••••• (برای تغییر وارد کنید)"
                    : "AIza..."
                }
                className="text-left"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <Label className="font-medium">ارائه‌دهنده هر قابلیت</Label>
            <div className="space-y-2">
              {AI_FEATURE_IDS.map((featureId) => (
                <div
                  key={featureId}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm">{AI_FEATURE_LABELS[featureId]}</span>
                  <Select
                    value={form.watch(`featureProviders.${featureId}`)}
                    onValueChange={(value) =>
                      form.setValue(
                        `featureProviders.${featureId}`,
                        value as AiProviderId
                      )
                    }
                  >
                    <SelectTrigger className="sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(providerLabels) as AiProviderId[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {providerLabels[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>سقف توکن روزانه (خالی = نامحدود)</Label>
            <Input
              {...form.register("dailyTokenLimit")}
              dir="ltr"
              type="number"
              min={1}
              placeholder="مثلاً 100000"
              className="text-left"
            />
            <p className="text-xs text-muted-foreground">مصرف امروز: {usageLabel}</p>
            {publicSettings?.limitExceeded && (
              <p className="text-xs text-destructive">سقف مصرف روزانه به پایان رسیده است.</p>
            )}
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending && testingProvider === null
              ? "در حال ذخیره..."
              : "ذخیره تنظیمات هوش مصنوعی"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
