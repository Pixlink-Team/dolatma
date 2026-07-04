"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getMapBilboardSettingsAction,
  saveMapBilboardSettingsAction,
  testMapBilboardConnectionAction,
} from "@/lib/actions/integration-actions";
import type { MapBilboardApiSettingsPublic } from "@/lib/types";

const schema = z.object({
  baseUrl: z.string().url("آدرس پایه نامعتبر است").or(z.literal("")),
  email: z.string().min(1, "نام کاربری الزامی است"),
  password: z.string().optional(),
  token: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function MapBilboardIntegrationForm() {
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();
  const [publicSettings, setPublicSettings] = useState<MapBilboardApiSettingsPublic | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      baseUrl: "https://billboard.pixlink.ir",
      email: "",
      password: "",
      token: "",
    },
  });

  useEffect(() => {
    getMapBilboardSettingsAction().then((settings) => {
      if (!settings) return;
      setPublicSettings(settings);
      form.reset({
        baseUrl: settings.baseUrl,
        email: settings.email,
        password: "",
        token: "",
      });
    });
  }, [form]);

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const result = await saveMapBilboardSettingsAction({
        baseUrl: data.baseUrl || undefined,
        email: data.email,
        password: data.password || undefined,
        token: data.token || undefined,
      });

      if (!result.success) {
        toast.error(result.error ?? "ذخیره ناموفق بود");
        return;
      }

      const refreshed = await getMapBilboardSettingsAction();
      if (refreshed) setPublicSettings(refreshed);
      form.setValue("password", "");
      form.setValue("token", "");
      toast.success("تنظیمات اتصال ذخیره شد");
    });
  };

  const handleTest = () => {
    startTestTransition(async () => {
      const result = await testMapBilboardConnectionAction();
      if (!result.success) {
        toast.error(result.error ?? "اتصال ناموفق بود");
        return;
      }
      toast.success("اتصال به Map-Bilboard برقرار است");
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">وضعیت:</span>
        {publicSettings?.configured ? (
          <Badge variant="success">متصل</Badge>
        ) : (
          <Badge variant="warning">تنظیم نشده</Badge>
        )}
      </div>

      <div className="space-y-2">
        <Label>آدرس API</Label>
        <Input {...form.register("baseUrl")} dir="ltr" placeholder="https://billboard.pixlink.ir" />
      </div>

      <div className="space-y-2">
        <Label>نام کاربری ادمین Map-Bilboard</Label>
        <Input {...form.register("email")} dir="ltr" placeholder="admin" />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>رمز عبور</Label>
        <Input
          type="password"
          {...form.register("password")}
          placeholder={publicSettings?.hasPassword ? "•••••••• (برای تغییر وارد کنید)" : "رمز ادمین Map-Bilboard"}
        />
      </div>

      <div className="space-y-2">
        <Label>توکن Sanctum (اختیاری)</Label>
        <Input
          {...form.register("token")}
          dir="ltr"
          placeholder={publicSettings?.hasToken ? "توکن ذخیره شده — برای تغییر وارد کنید" : "خالی = ورود خودکار با نام کاربری/رمز"}
        />
        <p className="text-xs text-muted-foreground">
          اگر خالی بماند، سرور با نام کاربری و رمز بالا خودکار login می‌کند.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "در حال ذخیره..." : "ذخیره تنظیمات"}
        </Button>
        <Button type="button" variant="outline" disabled={isTesting} onClick={handleTest}>
          {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "تست اتصال"}
        </Button>
      </div>
    </form>
  );
}
