"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { MediaUpload } from "@/components/ui/media-upload";
import {
  getAdminLoginPageSettingsAction,
  saveLoginPageSettingsAction,
} from "@/lib/actions/login-page-settings-actions";
import {
  DEFAULT_LOGIN_CUSTOM_BACKGROUND,
  DEFAULT_LOGIN_PAGE_SETTINGS,
} from "@/lib/login-page-defaults";
import type { LoginBackgroundMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const schema = z.object({
  eyebrow: z.string().trim().min(1, "الزامی است").max(120),
  title: z.string().trim().min(1, "الزامی است").max(120),
  subtitle: z.string().trim().min(1, "الزامی است").max(120),
  footer: z.string().trim().min(1, "الزامی است").max(120),
  backgroundMode: z.enum(["time_of_day", "custom"]),
  customBackgroundUrl: z.string().nullable(),
  preRegistrationEnabled: z.boolean(),
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

export function LoginPageSettingsCard() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { ...DEFAULT_LOGIN_PAGE_SETTINGS },
  });

  const backgroundMode = form.watch("backgroundMode");
  const customBackgroundUrl = form.watch("customBackgroundUrl");
  const preRegistrationEnabled = form.watch("preRegistrationEnabled");

  useEffect(() => {
    getAdminLoginPageSettingsAction().then((settings) => {
      if (!settings) return;
      form.reset(settings);
    });
  }, [form]);

  const onSubmit = (data: FormData) => {
    if (data.backgroundMode === "custom" && !data.customBackgroundUrl?.trim()) {
      toast.error("برای حالت تصویر سفارشی، یک تصویر آپلود کنید");
      return;
    }

    startTransition(async () => {
      const result = await saveLoginPageSettingsAction(data);
      if (!result.success) {
        toast.error(result.error ?? "ذخیره تنظیمات ورود ناموفق بود");
        return;
      }
      toast.success("تنظیمات صفحه ورود ذخیره شد");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">تنظیمات صفحه ورود</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

          <Button type="submit" disabled={isPending}>
            {isPending ? "در حال ذخیره..." : "ذخیره تنظیمات ورود"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
