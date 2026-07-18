"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, SkipForward, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaUpload } from "@/components/ui/media-upload";
import { PersianDateField } from "@/components/ui/persian-date-input";
import { PlanLabelSelect } from "@/components/admin/plan-label-select";
import { saveCampaignActivityAction } from "@/lib/actions/extended-actions";
import { getActivityTypeLabel, pressActivityTypeOptions } from "@/lib/activity-types";
import type { ContentTopic } from "@/lib/content-topics";
import {
  CONTENT_TITLE_MAX_LENGTH,
  CONTENT_TITLE_MAX_LENGTH_MESSAGE,
} from "@/lib/content-constraints";
import { todayISO } from "@/lib/jalali";
import { stripFileAccessToken } from "@/lib/uploads";
import type { ActivityMediaItem } from "@/lib/types";

const MAX_MEDIA_ITEMS = 10;

const schema = z.object({
  title: z
    .string()
    .min(1, "عنوان الزامی است")
    .max(CONTENT_TITLE_MAX_LENGTH, CONTENT_TITLE_MAX_LENGTH_MESSAGE),
  activityType: z.enum(["magazine", "newspaper"]),
  activityDate: z.string().min(1),
  location: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface PressFormInitialValues {
  title?: string;
  activityType?: "magazine" | "newspaper";
  activityDate?: string;
  location?: string;
  description?: string;
  imageUrl?: string;
}

interface PressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  ownerUserId?: string | null;
  initialValues?: PressFormInitialValues | null;
  initialValuesKey?: string | null;
  contentPlans?: string[];
  contentTopics?: ContentTopic[];
  queueLabel?: string;
  onSaved?: () => void;
  onSkip?: () => void;
  bulkTypeSwitcher?: ReactNode;
}

export function PressFormDialog({
  open,
  onOpenChange,
  campaignId,
  ownerUserId = null,
  initialValues = null,
  initialValuesKey = null,
  contentPlans = [],
  contentTopics = [],
  queueLabel,
  onSaved,
  onSkip,
  bulkTypeSwitcher,
}: PressFormDialogProps) {
  const [mediaItems, setMediaItems] = useState<ActivityMediaItem[]>([]);
  const [planLabels, setPlanLabels] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      activityType: "magazine",
      activityDate: todayISO(),
      location: "",
      description: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      title: initialValues?.title?.trim() || "",
      activityType: initialValues?.activityType || "magazine",
      activityDate: initialValues?.activityDate || todayISO(),
      location: initialValues?.location || "",
      description: initialValues?.description || "",
    });
    setPlanLabels([]);
    const imageUrl = initialValues?.imageUrl?.trim();
    setMediaItems(
      imageUrl
        ? [{ id: crypto.randomUUID(), type: "image", url: imageUrl }]
        : []
    );
  }, [open, initialValues, initialValuesKey, form]);

  const onSubmit = form.handleSubmit((data) => {
    const filledMedia = mediaItems
      .filter((item) => item.url.trim())
      .map((item) => ({
        ...item,
        url: stripFileAccessToken(item.url),
      }));

    startTransition(async () => {
      const result = await saveCampaignActivityAction({
        campaignId,
        ownerUserId: ownerUserId || undefined,
        title: data.title,
        activityType: data.activityType,
        activityDate: data.activityDate,
        location: data.location?.trim() ?? "",
        imageUrl: filledMedia.find((item) => item.type === "image")?.url ?? null,
        videoUrl: filledMedia.find((item) => item.type === "video")?.url ?? null,
        mediaItems: filledMedia,
        description: data.description || null,
        published: true,
        planLabels,
        planLabel: planLabels[0] ?? null,
      });

      if (!result.success) {
        toast.error("error" in result ? result.error : "ذخیره نشد");
        return;
      }

      toast.success("مجله / روزنامه ذخیره شد");
      onSaved?.();
      onOpenChange(false);
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ثبت مجله / روزنامه</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {queueLabel ? `${queueLabel} — ` : ""}
            داده‌های Excel پر شده‌اند؛ بقیه را اصلاح یا تکمیل کنید.
          </p>
        </DialogHeader>

        {bulkTypeSwitcher}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>عنوان</Label>
            <Input {...form.register("title")} maxLength={CONTENT_TITLE_MAX_LENGTH} />
          </div>
          <div className="space-y-2">
            <Label>نوع</Label>
            <Select
              value={form.watch("activityType")}
              onValueChange={(value) =>
                form.setValue("activityType", value as FormValues["activityType"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pressActivityTypeOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {getActivityTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <PersianDateField control={form.control} name="activityDate" label="تاریخ" />
          <div className="space-y-2">
            <Label>مکان (اختیاری)</Label>
            <Input {...form.register("location")} />
          </div>
          <PlanLabelSelect
            topics={contentTopics}
            plans={contentPlans}
            values={planLabels}
            onChangeMultiple={setPlanLabels}
          />
          <div className="space-y-2">
            <Label>توضیح</Label>
            <Textarea {...form.register("description")} rows={3} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>رسانه‌ها</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (mediaItems.length >= MAX_MEDIA_ITEMS) {
                    toast.error(`حداکثر ${MAX_MEDIA_ITEMS} فایل مجاز است`);
                    return;
                  }
                  setMediaItems((prev) => [
                    ...prev,
                    { id: crypto.randomUUID(), type: "image", url: "" },
                  ]);
                }}
              >
                + تصویر
              </Button>
            </div>
            {mediaItems.map((item) => (
              <div key={item.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">تصویر</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setMediaItems((prev) => prev.filter((media) => media.id !== item.id))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <MediaUpload
                  value={item.url}
                  onChange={(url) =>
                    setMediaItems((prev) =>
                      prev.map((media) => (media.id === item.id ? { ...media, url } : media))
                    )
                  }
                  label="تصویر"
                  kind="image"
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {onSkip ? (
              <Button type="button" variant="outline" disabled={isPending} onClick={onSkip}>
                <SkipForward className="h-4 w-4" />
                رد کردن
              </Button>
            ) : null}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              ثبت
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
