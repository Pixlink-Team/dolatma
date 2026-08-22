"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaUpload } from "@/components/ui/media-upload";
import { updateSettingsAction } from "@/lib/actions/admin-actions";
import { getActionErrorMessage, isActionFailure } from "@/lib/action-result";
import { DEFAULT_FAVICON_URL } from "@/lib/campaign-branding";

const FAVICON_MAX_BYTES = 512 * 1024;
const FAVICON_OPTIMIZE = {
  maxEdge: 128,
  quality: 0.88,
  targetMaxBytes: 80 * 1024,
} as const;

interface CampaignFaviconCardProps {
  campaignId: string;
  campaignTitle: string;
  initialFaviconUrl?: string | null;
}

export function CampaignFaviconCard({
  campaignId,
  campaignTitle,
  initialFaviconUrl,
}: CampaignFaviconCardProps) {
  const [faviconUrl, setFaviconUrl] = useState(initialFaviconUrl ?? "");
  const [isPending, startTransition] = useTransition();

  const persist = (url: string) => {
    startTransition(async () => {
      const result = await updateSettingsAction({
        id: campaignId,
        title: campaignTitle,
        faviconUrl: url.trim() || null,
      });
      if (isActionFailure(result)) {
        toast.error(getActionErrorMessage(result, "ذخیره فاویکون ناموفق بود"));
        return;
      }
      toast.success("فاویکون ذخیره شد");
    });
  };

  const handleChange = (url: string) => {
    setFaviconUrl(url);
    persist(url);
  };

  const previewUrl = faviconUrl.trim() || DEFAULT_FAVICON_URL;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">فاویکون راستا</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          آیکون تب مرورگر برای صفحات این راستا. اگر خالی باشد از لوگوی پیش‌فرض سایت استفاده
          می‌شود.
        </p>
        <MediaUpload
          label="آپلود فاویکون"
          value={faviconUrl}
          onChange={handleChange}
          accept="image/png,image/webp,image/x-icon,image/svg+xml,.ico"
          optimizeBeforeUpload={FAVICON_OPTIMIZE}
          maxFileSizeBytes={FAVICON_MAX_BYTES}
          showPreview
          dropzone
        />
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="پیش‌نمایش فاویکون"
            className="h-8 w-8 rounded border bg-white object-contain p-0.5"
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            تصویر مربع ۳۲×۳۲ تا ۱۲۸×۱۲۸ پیکسل — PNG یا ICO (پیشنهادی) — حداکثر ۵۱۲
            کیلوبایت. WebP در بعضی مرورگرها به‌عنوان فاویکون نمایش داده نمی‌شود.
            {isPending ? " — در حال ذخیره..." : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
