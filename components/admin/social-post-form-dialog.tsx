"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, SkipForward } from "lucide-react";
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
import { SocialPlatformIcon, getSocialPlatformLabel } from "@/components/public/social-platform-icon";
import { saveSocialPostAction } from "@/lib/actions/extended-actions";
import type { ContentTopic } from "@/lib/content-topics";
import {
  CONTENT_TITLE_MAX_LENGTH,
  CONTENT_TITLE_MAX_LENGTH_MESSAGE,
} from "@/lib/content-constraints";
import { todayISO } from "@/lib/jalali";
import { stripFileAccessToken } from "@/lib/uploads";
import { getStatusLabel } from "@/lib/utils";
import type { SocialContentType, SocialPlatform, SocialPostPlatform } from "@/lib/types";

const schema = z.object({
  platform: z.enum([
    "instagram",
    "x",
    "telegram",
    "linkedin",
    "youtube",
    "aparat",
    "rubika",
    "eitaa",
    "soroush",
    "bale",
    "site",
    "other",
  ]),
  title: z.string().min(1).max(CONTENT_TITLE_MAX_LENGTH, CONTENT_TITLE_MAX_LENGTH_MESSAGE),
  coverImageUrl: z.string().optional(),
  views: z.coerce.number().min(0),
  likes: z.coerce.number().min(0),
  comments: z.coerce.number().min(0),
  shares: z.coerce.number().min(0),
  link: z.string().optional(),
  contentType: z.enum(["image", "text", "video", "carousel", "story", "reel", "audio"]),
  mediaUrl: z.string().optional(),
  description: z.string().optional(),
  publishedDate: z.string(),
});

type FormValues = z.infer<typeof schema>;

const platformOptions: SocialPostPlatform[] = [
  "instagram",
  "x",
  "telegram",
  "linkedin",
  "youtube",
  "aparat",
  "rubika",
  "eitaa",
  "soroush",
  "bale",
  "site",
  "other",
];

const contentTypeOptions: SocialContentType[] = [
  "image",
  "text",
  "video",
  "carousel",
  "story",
  "reel",
  "audio",
];

export interface SocialPostFormInitialValues {
  platform?: SocialPostPlatform;
  title?: string;
  coverImageUrl?: string;
  mediaUrl?: string;
  description?: string;
  publishedDate?: string;
  link?: string;
}

interface SocialPostFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  ownerUserId?: string | null;
  initialValues?: SocialPostFormInitialValues | null;
  initialValuesKey?: string | null;
  contentPlans?: string[];
  contentTopics?: ContentTopic[];
  onSaved?: () => void;
  onSkip?: () => void;
  queueLabel?: string;
}

function platformLabel(platform: SocialPostPlatform): string {
  if (platform === "site") return "سایت / پورتال";
  return getSocialPlatformLabel(platform as SocialPlatform);
}

export function SocialPostFormDialog({
  open,
  onOpenChange,
  campaignId,
  ownerUserId = null,
  initialValues = null,
  initialValuesKey = null,
  contentPlans = [],
  contentTopics = [],
  onSaved,
  onSkip,
  queueLabel,
}: SocialPostFormDialogProps) {
  const [planLabels, setPlanLabels] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      platform: "instagram",
      title: "",
      coverImageUrl: "",
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      link: "",
      contentType: "image",
      mediaUrl: "",
      description: "",
      publishedDate: todayISO(),
    },
  });

  useEffect(() => {
    if (!open) return;
    const imageUrl = initialValues?.coverImageUrl || initialValues?.mediaUrl || "";
    form.reset({
      platform: initialValues?.platform || "instagram",
      title: initialValues?.title?.trim() || "",
      coverImageUrl: imageUrl,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      link: initialValues?.link || "",
      contentType: "image",
      mediaUrl: imageUrl,
      description: initialValues?.description || "",
      publishedDate: initialValues?.publishedDate || todayISO(),
    });
    setPlanLabels([]);
  }, [open, initialValues, initialValuesKey, form]);

  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      const cover = stripFileAccessToken(data.coverImageUrl || "");
      const media = stripFileAccessToken(data.mediaUrl || cover);
      const result = await saveSocialPostAction({
        campaignId,
        ownerUserId: ownerUserId || undefined,
        platform: data.platform,
        title: data.title,
        coverImageUrl: cover || null,
        mediaUrl: media || null,
        description: data.description || null,
        link: data.link || "",
        contentType: data.contentType,
        views: data.views,
        likes: data.likes,
        comments: data.comments,
        shares: data.shares,
        publishedDate: data.publishedDate,
        published: true,
        planLabels,
        planLabel: planLabels[0] ?? null,
      });

      if (!result.success) {
        toast.error("error" in result ? result.error : "ذخیره نشد");
        return;
      }

      toast.success("پست ذخیره شد");
      onSaved?.();
      onOpenChange(false);
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>پست جدید</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {queueLabel ? `${queueLabel} — ` : ""}
            داده‌های Excel پر شده‌اند؛ بقیه را اصلاح یا تکمیل کنید.
          </p>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 text-right">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>کانال</Label>
              <Select
                value={form.watch("platform")}
                onValueChange={(value) =>
                  form.setValue("platform", value as FormValues["platform"])
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      {form.watch("platform") !== "site" ? (
                        <SocialPlatformIcon
                          platform={form.watch("platform") as SocialPlatform}
                          size="sm"
                          className="h-5 w-5 rounded-md"
                        />
                      ) : null}
                      {platformLabel(form.watch("platform"))}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {platformOptions.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      <span className="flex items-center gap-2">
                        {platform !== "site" ? (
                          <SocialPlatformIcon
                            platform={platform as SocialPlatform}
                            size="sm"
                            className="h-5 w-5 rounded-md"
                          />
                        ) : null}
                        {platformLabel(platform)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>نوع محتوا</Label>
              <Select
                value={form.watch("contentType")}
                onValueChange={(value) =>
                  form.setValue("contentType", value as SocialContentType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getStatusLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>عنوان / نام کاور</Label>
            <Input {...form.register("title")} maxLength={CONTENT_TITLE_MAX_LENGTH} />
          </div>

          <PlanLabelSelect
            topics={contentTopics}
            plans={contentPlans}
            values={planLabels}
            onChangeMultiple={setPlanLabels}
          />

          <PersianDateField control={form.control} name="publishedDate" label="تاریخ انتشار" />

          <div className="space-y-2">
            <Label>لینک</Label>
            <Input {...form.register("link")} dir="ltr" placeholder="https://" />
          </div>

          <div className="space-y-2">
            <Label>توضیح</Label>
            <Textarea {...form.register("description")} rows={3} />
          </div>

          <MediaUpload
            label="کاور"
            kind="image"
            value={form.watch("coverImageUrl") || ""}
            onChange={(url) => {
              form.setValue("coverImageUrl", url);
              if (!form.getValues("mediaUrl")) form.setValue("mediaUrl", url);
            }}
          />

          <MediaUpload
            label="رسانه"
            kind="image"
            value={form.watch("mediaUrl") || ""}
            onChange={(url) => form.setValue("mediaUrl", url)}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>بازدید</Label>
              <Input type="number" min={0} {...form.register("views")} />
            </div>
            <div className="space-y-2">
              <Label>لایک</Label>
              <Input type="number" min={0} {...form.register("likes")} />
            </div>
            <div className="space-y-2">
              <Label>کامنت</Label>
              <Input type="number" min={0} {...form.register("comments")} />
            </div>
            <div className="space-y-2">
              <Label>اشتراک</Label>
              <Input type="number" min={0} {...form.register("shares")} />
            </div>
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
              ثبت پست
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
