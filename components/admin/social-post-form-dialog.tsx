"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SkipForward } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaUpload } from "@/components/ui/media-upload";
import { PersianDateField } from "@/components/ui/persian-date-input";
import {
  AdminEditorDialog,
  AdminEditorDialogActions,
} from "@/components/admin/admin-editor-dialog";
import { PlanLabelSelect } from "@/components/admin/plan-label-select";
import { ProductionSourcePicker } from "@/components/admin/production-source-picker";
import { SocialPlatformIcon, getSocialPlatformLabel } from "@/components/public/social-platform-icon";
import { saveSocialPostAction } from "@/lib/actions/extended-actions";
import type { ContentTopic } from "@/lib/content-topics";
import {
  CONTENT_TITLE_MAX_LENGTH,
  CONTENT_TITLE_MAX_LENGTH_MESSAGE,
} from "@/lib/content-constraints";
import { useInvalidFormFields } from "@/lib/hooks/use-invalid-form-fields";
import { todayISO } from "@/lib/jalali";
import type { ProductionSourceType } from "@/lib/production-source-shared";
import { stripFileAccessToken } from "@/lib/uploads";
import { cn, getStatusLabel } from "@/lib/utils";
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
    "news_agency",
    "other",
  ]),
  title: z
    .string()
    .min(1, "عنوان الزامی است")
    .max(CONTENT_TITLE_MAX_LENGTH, CONTENT_TITLE_MAX_LENGTH_MESSAGE),
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
  "news_agency",
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

const EMPTY_PLAN_LABELS: string[] = [];

export interface SocialPostFormInitialValues {
  platform?: SocialPostPlatform;
  title?: string;
  coverImageUrl?: string;
  mediaUrl?: string;
  description?: string;
  publishedDate?: string;
  link?: string;
  contentType?: SocialContentType;
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
  /** Optional control for bulk import (e.g. switch content section). */
  bulkTypeSwitcher?: ReactNode;
  /** Prefill production source (e.g. publish from ready-productions card). */
  initialSourceProduction?: { type: ProductionSourceType; id: string } | null;
  initialPlanLabels?: string[];
}

function platformLabel(platform: SocialPostPlatform): string {
  if (platform === "site") return "سایت / پورتال";
  if (platform === "news_agency") return "خبرگزاری";
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
  bulkTypeSwitcher,
  initialSourceProduction = null,
  initialPlanLabels = EMPTY_PLAN_LABELS,
}: SocialPostFormDialogProps) {
  const [planLabels, setPlanLabels] = useState<string[]>([]);
  const { reportInvalid, clearInvalid, isFieldInvalid } = useInvalidFormFields();
  const [sourceProductionType, setSourceProductionType] = useState<ProductionSourceType | null>(null);
  const [sourceProductionId, setSourceProductionId] = useState<string | null>(null);
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
    if (!open) {
      clearInvalid();
      return;
    }
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
      contentType: initialValues?.contentType || "image",
      mediaUrl: imageUrl,
      description: initialValues?.description || "",
      publishedDate: initialValues?.publishedDate || todayISO(),
    });
    setPlanLabels(initialPlanLabels);
    setSourceProductionType(initialSourceProduction?.type ?? null);
    setSourceProductionId(initialSourceProduction?.id ?? null);
    // Reset only when dialog opens or the prefill key changes — not on unstable object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValuesKey]);

  const watchedTitle = form.watch("title");
  const showTitleError =
    Boolean(form.formState.errors.title) ||
    isFieldInvalid("title", !watchedTitle?.trim());
  const highlightPlanLabels = isFieldInvalid("planLabels", planLabels.length === 0);

  const onSubmit = form.handleSubmit(
    (data) => {
    if (planLabels.length === 0) {
      reportInvalid(["planLabels"]);
      return;
    }
    clearInvalid();

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
        sourceProductionType,
        sourceProductionId,
      });

      if (!result.success) {
        toast.error("error" in result ? result.error : "ذخیره نشد");
        return;
      }

      toast.success("پست ذخیره شد");
      onSaved?.();
      onOpenChange(false);
    });
  },
  (errors) => {
    reportInvalid(Object.keys(errors));
  }
  );

  return (
    <AdminEditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="پست جدید"
      description={
        queueLabel
          ? `${queueLabel} — داده‌های Excel پر شده‌اند؛ بقیه را اصلاح یا تکمیل کنید.`
          : initialSourceProduction
            ? "تولید انتخاب‌شده از قبل پر شده؛ جزئیات نشر را تکمیل کنید."
            : "جزئیات پست را وارد کنید."
      }
      descriptionVisible
      formProps={{ onSubmit }}
      footer={
        <AdminEditorDialogActions
          submit
          isPending={isPending}
          saveLabel="ثبت پست"
          pendingLabel="در حال ذخیره..."
          extra={
            onSkip ? (
              <Button type="button" variant="outline" disabled={isPending} onClick={onSkip}>
                <SkipForward className="h-4 w-4" />
                رد کردن
              </Button>
            ) : null
          }
        />
      }
    >
      {bulkTypeSwitcher}

      <ProductionSourcePicker
        campaignId={campaignId}
        valueType={sourceProductionType}
        valueId={sourceProductionId}
        label="کدام تولید را نشر می‌کنید؟"
        onChange={(item) => {
          setSourceProductionType(item?.type ?? null);
          setSourceProductionId(item?.id ?? null);
        }}
      />
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

      <div data-field="title" className="space-y-2">
        <Label className={cn(showTitleError && "text-destructive")}>عنوان / نام کاور</Label>
        <Input
          {...form.register("title")}
          maxLength={CONTENT_TITLE_MAX_LENGTH}
          className={cn(showTitleError && "border-destructive focus-visible:ring-destructive")}
        />
        {showTitleError && (
          <p className="text-xs text-destructive">عنوان خالی است؛ لطفاً تکمیل کنید.</p>
        )}
      </div>

      <PlanLabelSelect
        topics={contentTopics}
        plans={contentPlans}
        values={planLabels}
        onChangeMultiple={setPlanLabels}
        invalid={highlightPlanLabels}
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

      {form.watch("contentType") === "audio" ? (
        <MediaUpload
          label="رسانه (صوت)"
          kind="audio"
          uploadKind="audio"
          accept="audio/*"
          fileOnly
          value={form.watch("mediaUrl") || ""}
          onChange={(url) => form.setValue("mediaUrl", url)}
        />
      ) : form.watch("contentType") === "video" || form.watch("contentType") === "reel" ? (
        <MediaUpload
          label="رسانه (ویدیو)"
          kind="video"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          maxFileSizeBytes={100 * 1024 * 1024}
          coverImageUrl={form.watch("coverImageUrl")}
          onAutoCoverGenerated={(coverUrl) => {
            const currentCover = form.getValues("coverImageUrl")?.trim() ?? "";
            if (!currentCover) form.setValue("coverImageUrl", coverUrl);
          }}
          value={form.watch("mediaUrl") || ""}
          onChange={(url) => form.setValue("mediaUrl", url)}
        />
      ) : (
        <MediaUpload
          label="رسانه"
          kind="image"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          maxFileSizeBytes={100 * 1024 * 1024}
          coverImageUrl={form.watch("coverImageUrl")}
          onAutoCoverGenerated={(coverUrl) => {
            const currentCover = form.getValues("coverImageUrl")?.trim() ?? "";
            if (!currentCover) form.setValue("coverImageUrl", coverUrl);
          }}
          onUploadedFile={(file) => {
            if (file.type.startsWith("video/")) {
              const currentType = form.getValues("contentType");
              if (currentType === "image" || currentType === "text") {
                form.setValue("contentType", "video");
              }
            }
          }}
          value={form.watch("mediaUrl") || ""}
          onChange={(url) => form.setValue("mediaUrl", url)}
        />
      )}

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
    </AdminEditorDialog>
  );
}
