"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContentSectionFormRenderer,
  type BillboardSectionFormValues,
} from "@/components/admin/content-section-form-renderer";
import {
  appendPeriodFilesToFormData,
  buildPeriodsFormPayload,
  createDisplayPeriod,
  type DisplayPeriodDraft,
} from "@/components/admin/billboard-display-periods-editor";
import {
  matchBillboardCategoryKey,
  type BillboardCategory,
} from "@/lib/billboard-categories";
import {
  parseAddressFromBillboard,
  parseAreaSqmFromBillboard,
  parseProvinceFromBillboard,
} from "@/lib/billboard-form-utils";
import { getSectionContentFormAction } from "@/lib/actions/section-form-actions";
import { normalizePlanLabels, type ContentTopic } from "@/lib/content-topics";
import {
  defaultContentFormFields,
  fieldByWidget,
  hasSystemWidget,
  parseMetadataObject,
} from "@/lib/section-content-forms";
import {
  isDefaultBillboardTitle,
  isPlaceholderBillboardImage,
  type EditSuggestionMissingField,
} from "@/lib/edit-suggestions";
import { getLocationCenter, resolveLocationNames } from "@/lib/iran-location-center";
import type {
  Billboard,
  BillboardDisplayPeriod,
  ContentFormField,
} from "@/lib/types";

interface ContributorProfile {
  province?: string | null;
  city?: string | null;
  email: string;
  name: string;
}

export interface BillboardCreateInitialValues {
  axis?: string;
  address?: string;
  province?: string;
  city?: string;
  notes?: string;
  category?: BillboardCategory;
  periods?: Array<{
    title?: string;
    startDate: string;
    endDate: string;
    existingBillboardImageUrl?: string | null;
  }>;
}

interface BillboardCreateAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  contentPlans?: string[];
  contentTopics?: ContentTopic[];
  canScore?: boolean;
  mode: "admin" | "client";
  contributorProfile?: ContributorProfile | null;
  editingBillboard?: Billboard | null;
  /** Prefill for create mode (e.g. bulk Excel import). Ignored when editing. */
  initialValues?: BillboardCreateInitialValues | null;
  /** Stable key so advancing bulk queue reloads the form. */
  initialValuesKey?: string | null;
  /** Admin-only: assign content to this user on create. */
  ownerUserId?: string | null;
  highlightFields?: EditSuggestionMissingField[];
  onCreated?: () => void;
  /** Optional skip control for bulk import queue. */
  onSkip?: () => void;
  skipLabel?: string;
  /** Optional control for bulk import (e.g. switch content section). */
  bulkTypeSwitcher?: ReactNode;
}

function periodsToDrafts(periods: BillboardDisplayPeriod[]): DisplayPeriodDraft[] {
  if (periods.length === 0) return [createDisplayPeriod()];

  return periods.map((period) => ({
    id: period.id,
    title: period.title ?? "",
    startDate: period.startDate,
    endDate: period.endDate,
    imageFile: null,
    billboardImageFile: null,
    existingBillboardImageUrl: period.billboardImageUrl,
    existingConfirmationImageUrl: period.confirmationImageUrl ?? null,
  }));
}

function fallbackDraftFromBillboard(billboard: Billboard): DisplayPeriodDraft[] {
  return [
    {
      id: crypto.randomUUID(),
      title: "",
      startDate: billboard.date,
      endDate: billboard.date,
      imageFile: null,
      billboardImageFile: null,
      existingBillboardImageUrl: billboard.thumbnailUrl,
      existingConfirmationImageUrl: null,
    },
  ];
}

function emptyValues(): BillboardSectionFormValues {
  return {
    category: "billboard",
    province: "",
    city: "",
    axis: "",
    areaSqm: "",
    address: "",
    latitude: 35.6892,
    longitude: 51.389,
    mapCenter: { lat: 35.6892, lng: 51.389 },
    notes: "",
    planLabels: [],
    periods: [createDisplayPeriod()],
    score: null,
    metadata: {},
  };
}

export function BillboardCreateAssignmentDialog({
  open,
  onOpenChange,
  campaignId,
  contentPlans = [],
  contentTopics = [],
  canScore = false,
  mode,
  contributorProfile = null,
  editingBillboard = null,
  initialValues = null,
  initialValuesKey = null,
  ownerUserId = null,
  highlightFields = [],
  onCreated,
  onSkip,
  skipLabel = "رد کردن",
  bulkTypeSwitcher,
}: BillboardCreateAssignmentDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fields, setFields] = useState<ContentFormField[]>(() =>
    defaultContentFormFields("billboards")
  );
  const [fieldsLoaded, setFieldsLoaded] = useState(false);
  const [values, setValues] = useState<BillboardSectionFormValues>(emptyValues);

  const isEditing = Boolean(editingBillboard);

  const hasPeriodMedia = values.periods.some(
    (period) =>
      Boolean(period.billboardImageFile) ||
      Boolean(
        period.existingBillboardImageUrl?.trim() &&
          !isPlaceholderBillboardImage(period.existingBillboardImageUrl)
      )
  );
  const highlightTitle =
    highlightFields.includes("title") &&
    (!values.axis.trim() || isDefaultBillboardTitle(values.axis));
  const highlightCity = highlightFields.includes("city") && !values.city.trim();
  const highlightLocation =
    highlightFields.includes("location") && !values.address.trim();
  const highlightDescription =
    highlightFields.includes("description") && !values.address.trim();
  const highlightMedia = highlightFields.includes("media") && !hasPeriodMedia;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const result = await getSectionContentFormAction("billboards");
      if (cancelled) return;
      if (result.success) {
        setFields(result.form.fields);
      }
      setFieldsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const loadForm = async () => {
      if (editingBillboard) {
        const resolvedProvince = parseProvinceFromBillboard(editingBillboard);
        const resolvedCity = editingBillboard.city;
        const center = getLocationCenter(resolvedProvince, resolvedCity);

        let nextPeriods = fallbackDraftFromBillboard(editingBillboard);
        try {
          const response = await fetch(
            `/api/billboard/periods?billboardId=${encodeURIComponent(editingBillboard.id)}`
          );
          const data = (await response.json()) as { periods?: BillboardDisplayPeriod[] };
          if (data.periods && data.periods.length > 0) {
            nextPeriods = periodsToDrafts(data.periods);
          }
        } catch {
          // keep fallback
        }

        setValues({
          category: matchBillboardCategoryKey(editingBillboard.category) || "billboard",
          province: resolvedProvince,
          city: resolvedCity,
          axis: editingBillboard.title,
          areaSqm: parseAreaSqmFromBillboard(editingBillboard),
          address: parseAddressFromBillboard(editingBillboard),
          latitude: editingBillboard.latitude ?? center.lat,
          longitude: editingBillboard.longitude ?? center.lng,
          mapCenter: {
            lat: editingBillboard.latitude ?? center.lat,
            lng: editingBillboard.longitude ?? center.lng,
            revision: Date.now(),
          },
          notes: editingBillboard.notes ?? "",
          planLabels: normalizePlanLabels(
            editingBillboard.planLabels,
            editingBillboard.planLabel
          ),
          periods: nextPeriods,
          score: editingBillboard.score,
          metadata: parseMetadataObject(editingBillboard.metadata),
        });
        return;
      }

      const profileProvince = initialValues?.province || contributorProfile?.province || "";
      const profileCity = initialValues?.city || contributorProfile?.city || "";
      const resolved = resolveLocationNames(profileProvince, profileCity);
      const center = getLocationCenter(resolved.province, resolved.city);

      const nextPeriods =
        initialValues?.periods && initialValues.periods.length > 0
          ? initialValues.periods.map((period) => ({
              id: crypto.randomUUID(),
              title: period.title ?? "",
              startDate: period.startDate,
              endDate: period.endDate,
              imageFile: null,
              billboardImageFile: null,
              existingBillboardImageUrl: period.existingBillboardImageUrl ?? null,
              existingConfirmationImageUrl: null,
            }))
          : [createDisplayPeriod()];

      setValues({
        category: initialValues?.category || "billboard",
        province: resolved.province,
        city: resolved.city,
        axis: initialValues?.axis?.trim() || "",
        areaSqm: "",
        address: initialValues?.address?.trim() || "",
        latitude: center.lat,
        longitude: center.lng,
        mapCenter: { lat: center.lat, lng: center.lng, revision: Date.now() },
        notes: initialValues?.notes?.trim() || "",
        planLabels: [],
        periods: nextPeriods,
        score: null,
        metadata: {},
      });
    };

    void loadForm();
  }, [open, contributorProfile, editingBillboard, initialValues, initialValuesKey]);

  const patchValues = (patch: Partial<BillboardSectionFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
  };

  const handleLocationCenterChange = (center: { lat: number; lng: number }) => {
    patchValues({
      mapCenter: { lat: center.lat, lng: center.lng, revision: Date.now() },
      latitude: center.lat,
      longitude: center.lng,
    });
  };

  const handleSubmit = () => {
    const axisField = fieldByWidget(fields, "axis");
    if ((axisField?.required ?? true) && values.axis.trim().length < 2) {
      toast.error("محور باید حداقل ۲ کاراکتر باشد");
      return;
    }

    if (hasSystemWidget(fields, "periods")) {
      for (const [index, period] of values.periods.entries()) {
        if (!period.startDate || !period.endDate) {
          toast.error(`تاریخ دوره ${index + 1} الزامی است`);
          return;
        }
        const hasBillboardImage =
          Boolean(period.billboardImageFile) ||
          Boolean(period.existingBillboardImageUrl?.trim());
        const periodsField = fieldByWidget(fields, "periods");
        if ((periodsField?.required ?? true) && !hasBillboardImage) {
          toast.error(`عکس بیلبورد در دوره ${index + 1} الزامی است`);
          return;
        }
      }
    }

    for (const field of fields) {
      if (field.kind !== "custom" || !field.required) continue;
      const raw = values.metadata[field.key];
      const empty =
        raw == null ||
        (typeof raw === "string" && !raw.trim()) ||
        (typeof raw === "number" && Number.isNaN(raw));
      if (empty && field.type !== "checkbox") {
        toast.error(`فیلد «${field.label}» الزامی است`);
        return;
      }
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("campaignId", campaignId);
      if (editingBillboard?.id) formData.append("billboardId", editingBillboard.id);
      formData.append("category", values.category);
      formData.append("axis", values.axis.trim() || "محور");
      formData.append("address", values.address.trim());
      formData.append("area_sqm", values.areaSqm.trim());
      formData.append("latitude", String(values.latitude));
      formData.append("longitude", String(values.longitude));

      const resolvedProvince =
        values.province || contributorProfile?.province?.trim() || "";
      const resolvedCity = values.city || contributorProfile?.city?.trim() || "";
      if (resolvedProvince) formData.append("province", resolvedProvince);
      if (resolvedCity) formData.append("city", resolvedCity);
      if (values.notes.trim()) formData.append("notes", values.notes.trim());
      if (!editingBillboard?.id && ownerUserId) {
        formData.append("ownerUserId", ownerUserId);
      }
      formData.append("published", "true");
      formData.append("status", "published");
      for (const label of values.planLabels) {
        formData.append("planLabels", label);
      }
      if (values.planLabels[0]) formData.append("planLabel", values.planLabels[0]);
      formData.append("metadata", JSON.stringify(values.metadata ?? {}));

      const periods =
        values.periods.length > 0 ? values.periods : [createDisplayPeriod()];
      formData.append("periods", JSON.stringify(buildPeriodsFormPayload(periods)));
      appendPeriodFilesToFormData(formData, periods);

      const response = await fetch("/api/billboard/create", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error ?? "ثبت تبلیغات محیطی ناموفق بود");
        return;
      }

      toast.success(
        isEditing ? "تبلیغات محیطی ویرایش شد" : "تبلیغات محیطی جدید ثبت شد"
      );
      onCreated?.();
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "ویرایش تبلیغات محیطی" : "ثبت تبلیغات محیطی جدید"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {initialValues
              ? "داده‌های Excel پر شده‌اند؛ بقیه فیلدها (مثل موقعیت دقیق روی نقشه) را تکمیل کنید."
              : contributorProfile?.province &&
                  contributorProfile?.city &&
                  !isEditing
                ? `استان و شهر از پروفایل ${contributorProfile.name} پر شده‌اند.`
                : "استان و شهر را انتخاب کنید تا نقشه به همان موقعیت برود."}{" "}
            می‌توانید چند دوره نمایش اضافه کنید.
          </p>
        </DialogHeader>

        {bulkTypeSwitcher}

        <div className="space-y-4">
          {!fieldsLoaded ? (
            <p className="text-sm text-muted-foreground">در حال بارگذاری فرم...</p>
          ) : (
            <ContentSectionFormRenderer
              sectionKey="billboards"
              fields={fields}
              values={values}
              onChange={patchValues}
              contentTopics={contentTopics}
              contentPlans={contentPlans}
              campaignId={campaignId}
              contentId={editingBillboard?.id}
              canScore={canScore}
              isNew={!isEditing}
              highlightTitle={highlightTitle}
              highlightCity={highlightCity}
              highlightLocation={highlightLocation}
              highlightDescription={highlightDescription}
              highlightMedia={highlightMedia}
              onLocationCenterChange={handleLocationCenterChange}
              showAdminNotes={mode === "admin"}
            />
          )}

          {highlightCity ? (
            <p className="text-xs text-destructive">شهر انتخاب نشده است؛ لطفاً تکمیل کنید.</p>
          ) : null}
          {highlightTitle ? (
            <p className="text-xs text-destructive">
              عنوان پیش‌فرض یا خالی است؛ یک عنوان اختصاصی وارد کنید.
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            {onSkip ? (
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={isPending}
                onClick={onSkip}
              >
                {skipLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              className="w-full"
              disabled={isPending || !fieldsLoaded}
              onClick={handleSubmit}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ذخیره...
                </>
              ) : isEditing ? (
                "ذخیره تغییرات"
              ) : (
                "ثبت تبلیغات محیطی"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
