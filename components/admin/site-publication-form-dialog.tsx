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
import { MediaUpload } from "@/components/ui/media-upload";
import { PersianDateField } from "@/components/ui/persian-date-input";
import {
  AdminEditorDialog,
  AdminEditorDialogActions,
} from "@/components/admin/admin-editor-dialog";
import { PlanLabelSelect } from "@/components/admin/plan-label-select";
import { ProductionSourcePicker } from "@/components/admin/production-source-picker";
import { saveSocialPostAction } from "@/lib/actions/extended-actions";
import type { ContentTopic } from "@/lib/content-topics";
import {
  CONTENT_TITLE_MAX_LENGTH,
  CONTENT_TITLE_MAX_LENGTH_MESSAGE,
} from "@/lib/content-constraints";
import { todayISO } from "@/lib/jalali";
import type { ProductionSourceType } from "@/lib/production-source-shared";
import { stripFileAccessToken } from "@/lib/uploads";

const schema = z.object({
  title: z
    .string()
    .min(1, "عنوان الزامی است")
    .max(CONTENT_TITLE_MAX_LENGTH, CONTENT_TITLE_MAX_LENGTH_MESSAGE),
  link: z.string().url("لینک معتبر وارد کنید").or(z.literal("")),
  coverImageUrl: z.string().optional(),
  description: z.string().optional(),
  publishedDate: z.string(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY_PLAN_LABELS: string[] = [];

export interface SitePublicationFormInitialValues {
  title?: string;
  link?: string;
  coverImageUrl?: string;
  description?: string;
  publishedDate?: string;
}

interface SitePublicationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  ownerUserId?: string | null;
  initialValues?: SitePublicationFormInitialValues | null;
  initialValuesKey?: string | null;
  contentPlans?: string[];
  contentTopics?: ContentTopic[];
  queueLabel?: string;
  onSaved?: () => void;
  onSkip?: () => void;
  bulkTypeSwitcher?: ReactNode;
  /** Prefill production source (e.g. publish from ready-productions card). */
  initialSourceProduction?: { type: ProductionSourceType; id: string } | null;
  initialPlanLabels?: string[];
}

export function SitePublicationFormDialog({
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
  initialSourceProduction = null,
  initialPlanLabels = EMPTY_PLAN_LABELS,
}: SitePublicationFormDialogProps) {
  const [planLabels, setPlanLabels] = useState<string[]>([]);
  const [sourceProductionType, setSourceProductionType] = useState<ProductionSourceType | null>(null);
  const [sourceProductionId, setSourceProductionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      link: "",
      coverImageUrl: "",
      description: "",
      publishedDate: todayISO(),
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      title: initialValues?.title?.trim() || "",
      link: initialValues?.link?.trim() || "",
      coverImageUrl: initialValues?.coverImageUrl || "",
      description: initialValues?.description || "",
      publishedDate: initialValues?.publishedDate || todayISO(),
    });
    setPlanLabels(initialPlanLabels);
    setSourceProductionType(initialSourceProduction?.type ?? null);
    setSourceProductionId(initialSourceProduction?.id ?? null);
  }, [
    open,
    initialValues,
    initialValuesKey,
    form,
    initialSourceProduction?.type,
    initialSourceProduction?.id,
    initialPlanLabels,
  ]);

  const onSubmit = form.handleSubmit((data) => {
    if (!data.link.trim()) {
      toast.error("لینک مطلب الزامی است");
      return;
    }
    if (!sourceProductionType || !sourceProductionId) {
      toast.error("برای ثبت نشر باید یک تولید (یا دارایی دستورکار) انتخاب شود");
      return;
    }

    startTransition(async () => {
      const cover = stripFileAccessToken(data.coverImageUrl || "");
      const result = await saveSocialPostAction({
        campaignId,
        ownerUserId: ownerUserId || undefined,
        platform: "site",
        contentType: "text",
        title: data.title,
        link: data.link.trim(),
        coverImageUrl: cover || null,
        description: data.description || null,
        publishedDate: data.publishedDate,
        published: true,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        planLabels,
        planLabel: planLabels[0] ?? null,
        sourceProductionType,
        sourceProductionId,
      });

      if (!result.success) {
        toast.error("error" in result ? result.error : "ذخیره نشد");
        return;
      }

      toast.success("انتشار در سایت ذخیره شد");
      onSaved?.();
      onOpenChange(false);
    });
  });

  return (
    <AdminEditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="انتشار جدید در سایت"
      description={
        queueLabel
          ? `${queueLabel} — داده‌های Excel پر شده‌اند؛ لینک مطلب را تکمیل کنید.`
          : initialSourceProduction
            ? "تولید انتخاب‌شده از قبل پر شده؛ جزئیات نشر را تکمیل کنید."
            : "جزئیات لینک مطلب را وارد کنید."
      }
      descriptionVisible
      formProps={{ onSubmit }}
      footer={
        <AdminEditorDialogActions
          submit
          isPending={isPending}
          saveLabel="ثبت انتشار"
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
        required
        label="کدام تولید را نشر می‌کنید؟"
        onChange={(item) => {
          setSourceProductionType(item?.type ?? null);
          setSourceProductionId(item?.id ?? null);
        }}
      />
      <div className="space-y-2">
        <Label>عنوان</Label>
        <Input {...form.register("title")} maxLength={CONTENT_TITLE_MAX_LENGTH} />
      </div>
      <PlanLabelSelect
        topics={contentTopics}
        plans={contentPlans}
        values={planLabels}
        onChangeMultiple={setPlanLabels}
      />
      <div className="space-y-2">
        <Label>لینک مطلب</Label>
        <Input {...form.register("link")} dir="ltr" placeholder="https://" />
      </div>
      <PersianDateField control={form.control} name="publishedDate" label="تاریخ انتشار" />
      <div className="space-y-2">
        <Label>توضیح</Label>
        <Textarea {...form.register("description")} rows={3} />
      </div>
      <MediaUpload
        label="تصویر شاخص"
        kind="image"
        value={form.watch("coverImageUrl") || ""}
        onChange={(url) => form.setValue("coverImageUrl", url)}
      />
    </AdminEditorDialog>
  );
}
