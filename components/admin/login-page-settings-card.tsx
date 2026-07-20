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
import {
  getAdminLoginPageSettingsAction,
  saveLoginPageSettingsAction,
} from "@/lib/actions/login-page-settings-actions";
import { DEFAULT_LOGIN_PAGE_SETTINGS } from "@/lib/login-page-defaults";

const schema = z.object({
  eyebrow: z.string().trim().min(1, "الزامی است").max(120),
  title: z.string().trim().min(1, "الزامی است").max(120),
  subtitle: z.string().trim().min(1, "الزامی است").max(120),
  footer: z.string().trim().min(1, "الزامی است").max(120),
});

type FormData = z.infer<typeof schema>;

export function LoginPageSettingsCard() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { ...DEFAULT_LOGIN_PAGE_SETTINGS },
  });

  useEffect(() => {
    getAdminLoginPageSettingsAction().then((settings) => {
      if (!settings) return;
      form.reset(settings);
    });
  }, [form]);

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const result = await saveLoginPageSettingsAction(data);
      if (!result.success) {
        toast.error(result.error ?? "ذخیره تنظیمات ورود ناموفق بود");
        return;
      }
      toast.success("متن‌های صفحه ورود ذخیره شد");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">تنظیمات صفحه ورود</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            عنوان و توضیحات نمایش‌داده‌شده در صفحه ورود پنل را از اینجا تغییر دهید.
          </p>

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
            {isPending ? "در حال ذخیره..." : "ذخیره متن‌های ورود"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
