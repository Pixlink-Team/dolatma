"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { MediaUpload } from "@/components/ui/media-upload";
import { AutoSaveStatusIndicator } from "@/components/admin/auto-save-status";
import {
  getAdminLoginPageSettingsAction,
  saveLoginPageSettingsAction,
} from "@/lib/actions/login-page-settings-actions";
import {
  DEFAULT_LOGIN_CUSTOM_BACKGROUND,
  DEFAULT_LOGIN_PAGE_SETTINGS,
} from "@/lib/login-page-defaults";
import { useAutoSave } from "@/lib/hooks/use-auto-save";
import type { LoginBackgroundMode, LoginFormAlignment } from "@/lib/types";
import { cn } from "@/lib/utils";

const schema = z.object({
  eyebrow: z.string().trim().min(1, "الزامی است").max(120),
  title: z.string().trim().min(1, "الزامی است").max(120),
  subtitle: z.string().trim().min(1, "الزامی است").max(120),
  footer: z.string().trim().min(1, "الزامی است").max(120),
  backgroundMode: z.enum(["time_of_day", "custom"]),
  customBackgroundUrl: z.string().nullable(),
  preRegistrationEnabled: z.boolean(),
  formAlignment: z.enum(["left", "center", "right"]),
});

type FormData = z.infer<typeof schema>;

const BACKGROUND_MODE_OPTIONS: Array<{
  value: LoginBackgroundMode;
  label: string;
  description: string;
}> = [
  {
    value: "custom",
    label: "تصویر سفارشی",
    description: "یک تصویر ثابت برای پس‌زمینه صفحه ورود",
  },
  {
    value: "time_of_day",
    label: "بر اساس ساعت روز",
    description: "تصاویر صبح، ظهر، عصر و شب به‌صورت خودکار",
  },
];

const FORM_ALIGNMENT_OPTIONS: Array<{
  value: LoginFormAlignment;
  label: string;
}> = [
  { value: "right", label: "راست" },
  { value: "center", label: "وسط" },
  { value: "left", label: "چپ" },
];

export function LoginPageSettingsCard() {
  const [ready, setReady] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { ...DEFAULT_LOGIN_PAGE_SETTINGS },
  });

  const backgroundMode = form.watch("backgroundMode");
  const customBackgroundUrl = form.watch("customBackgroundUrl");
  const preRegistrationEnabled = form.watch("preRegistrationEnabled");
  const formAlignment = form.watch("formAlignment");
  const formValues = form.watch();

  const persistSettings = useCallback(async (): Promise<boolean> => {
    const data = form.getValues();
    if (data.backgroundMode === "custom" && !data.customBackgroundUrl?.trim()) {
      return false;
    }

    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return false;
    }

    const result = await saveLoginPageSettingsAction(parsed.data);
    if (!result.success) {
      toast.error(result.error ?? "ذخیره تنظیمات ورود ناموفق بود");
      return false;
    }
    return true;
  }, [form]);

  const { status: saveStatus, markSaved } = useAutoSave({
    value: formValues,
    onSave: persistSettings,
    skip: !ready,
  });

  useEffect(() => {
    getAdminLoginPageSettingsAction().then((settings) => {
      if (!settings) return;
      form.reset(settings);
      markSaved(settings);
      setReady(true);
    });
  }, [form, markSaved]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">تنظیمات صفحه ورود</CardTitle>
          <AutoSaveStatusIndicator status={saveStatus} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            متن‌ها و پس‌زمینه صفحه ورود پنل را از اینجا تغییر دهید.
          </p>

          <div className="space-y-3 rounded-xl border p-4">
            <Label className="text-sm font-semibold">پس‌زمینه صفحه ورود</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {BACKGROUND_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => form.setValue("backgroundMode", option.value, { shouldDirty: true })}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-right transition",
                    backgroundMode === option.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:bg-muted/40"
                  )}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>
                </button>
              ))}
            </div>

            {backgroundMode === "custom" ? (
              <div className="space-y-3 pt-1">
                <MediaUpload
                  label="تصویر پس‌زمینه"
                  value={customBackgroundUrl ?? ""}
                  onChange={(url) =>
                    form.setValue("customBackgroundUrl", url || DEFAULT_LOGIN_CUSTOM_BACKGROUND, {
                      shouldDirty: true,
                    })
                  }
                  accept="image/jpeg,image/png,image/webp"
                  optimizeBeforeUpload={{ maxEdge: 2560, quality: 0.88, targetMaxBytes: 800 * 1024 }}
                />
                <p className="text-xs text-muted-foreground">
                  پیشنهاد: تصویر افقی ۱۶:۹ با کیفیت WebP یا JPG. حداکثر ۱۰ مگابایت.
                </p>
                {customBackgroundUrl ? (
                  <div
                    className="h-28 rounded-lg border bg-cover bg-center"
                    style={{ backgroundImage: `url('${customBackgroundUrl}')` }}
                    role="img"
                    aria-label="پیش‌نمایش پس‌زمینه ورود"
                  />
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                چهار تصویر صبح، ظهر، عصر و شب بر اساس ساعت محلی کاربر نمایش داده می‌شود.
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <Label className="text-sm font-semibold">موقعیت فرم ورود</Label>
            <div className="grid grid-cols-3 gap-2">
              {FORM_ALIGNMENT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => form.setValue("formAlignment", option.value, { shouldDirty: true })}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                    formAlignment === option.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:bg-muted/40"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              محل قرارگیری کارت ورود روی صفحه (راست، وسط یا چپ).
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
            <div className="space-y-1">
              <Label htmlFor="login-prereg-enabled" className="text-sm font-semibold">
                پیش‌ثبت‌نام در صفحه ورود
              </Label>
              <p className="text-xs text-muted-foreground">
                با غیرفعال کردن، تب پیش‌ثبت‌نام از صفحه ورود پنل حذف می‌شود.
              </p>
            </div>
            <Switch
              id="login-prereg-enabled"
              checked={preRegistrationEnabled}
              onCheckedChange={(checked) =>
                form.setValue("preRegistrationEnabled", checked, { shouldDirty: true })
              }
              aria-label="فعال‌سازی پیش‌ثبت‌نام در صفحه ورود"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-eyebrow">سطر بالای عنوان</Label>
            <Input id="login-eyebrow" {...form.register("eyebrow")} maxLength={120} />
            {form.formState.errors.eyebrow ? (
              <p className="text-xs text-destructive">{form.formState.errors.eyebrow.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-title">عنوان اصلی</Label>
            <Input id="login-title" {...form.register("title")} maxLength={120} />
            {form.formState.errors.title ? (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-subtitle">زیرعنوان</Label>
            <Input id="login-subtitle" {...form.register("subtitle")} maxLength={120} />
            {form.formState.errors.subtitle ? (
              <p className="text-xs text-destructive">{form.formState.errors.subtitle.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-footer">متن پایین فرم</Label>
            <Input id="login-footer" {...form.register("footer")} maxLength={120} />
            {form.formState.errors.footer ? (
              <p className="text-xs text-destructive">{form.formState.errors.footer.message}</p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
