"use client";

import { Label } from "@/components/ui/label";
import { ImageFileDropzone } from "@/components/ui/image-file-dropzone";
import { PersianDateInput } from "@/components/ui/persian-date-input";
import { todayISO } from "@/lib/jalali";
import { cn } from "@/lib/utils";

export interface DisplayPeriodDraft {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  imageFile: File | null;
  billboardImageFile: File | null;
  existingBillboardImageUrl?: string | null;
  existingConfirmationImageUrl?: string | null;
}

interface BillboardDisplayPeriodsEditorProps {
  periods: DisplayPeriodDraft[];
  onChange: (periods: DisplayPeriodDraft[]) => void;
  /** @deprecated Always single date + image; kept for call-site compatibility. */
  singlePeriod?: boolean;
  requireBillboardImage?: boolean;
  highlightMedia?: boolean;
}

export function createDisplayPeriod(): DisplayPeriodDraft {
  const today = todayISO();
  return {
    id: crypto.randomUUID(),
    title: "",
    startDate: today,
    endDate: today,
    imageFile: null,
    billboardImageFile: null,
  };
}

export function BillboardDisplayPeriodsEditor({
  periods,
  onChange,
  requireBillboardImage = false,
  highlightMedia = false,
}: BillboardDisplayPeriodsEditorProps) {
  const period = periods[0] ?? createDisplayPeriod();

  const updatePeriod = (patch: Partial<DisplayPeriodDraft>) => {
    onChange([{ ...period, ...patch }]);
  };

  const setDate = (date: string) => {
    updatePeriod({ startDate: date, endDate: date });
  };

  return (
    <div
      className={cn(
        "space-y-4",
        highlightMedia && "rounded-lg border border-destructive bg-destructive/5 p-3"
      )}
    >
      <div data-field="startDate" className="space-y-2">
        <Label className={cn(highlightMedia && "text-destructive")}>تاریخ *</Label>
        <PersianDateInput value={period.startDate} onChange={setDate} />
      </div>

      <div data-field="billboardImage" className="space-y-2">
        <ImageFileDropzone
          label="عکس بیلبورد"
          required={requireBillboardImage && !period.existingBillboardImageUrl}
          value={period.billboardImageFile}
          onChange={(file) => updatePeriod({ billboardImageFile: file })}
        />
        {!period.billboardImageFile && period.existingBillboardImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={period.existingBillboardImageUrl}
            alt="عکس فعلی"
            className="h-24 w-full rounded-md border object-cover"
          />
        )}
        {highlightMedia && (
          <p className="text-xs text-destructive">عکس بیلبورد هنوز اضافه نشده است.</p>
        )}
      </div>
    </div>
  );
}

export function buildPeriodsFormPayload(periods: DisplayPeriodDraft[]) {
  const list = periods.length > 0 ? periods.slice(0, 1) : [createDisplayPeriod()];
  return list.map((period, index) => {
    const date = period.startDate || period.endDate || todayISO();
    return {
      id: period.id,
      title: period.title.trim() || date,
      startDate: date,
      endDate: date,
      sortOrder: index,
      imageKey: `period_image_${period.id}`,
      billboardImageKey: `period_billboard_image_${period.id}`,
      billboardImageUrl: period.billboardImageFile
        ? undefined
        : period.existingBillboardImageUrl ?? undefined,
      confirmationImageUrl: period.imageFile
        ? undefined
        : period.existingConfirmationImageUrl ?? undefined,
    };
  });
}

export function appendPeriodFilesToFormData(formData: FormData, periods: DisplayPeriodDraft[]) {
  for (const period of periods.slice(0, 1)) {
    if (period.imageFile) {
      formData.append(`period_image_${period.id}`, period.imageFile);
    }
    if (period.billboardImageFile) {
      formData.append(`period_billboard_image_${period.id}`, period.billboardImageFile);
    }
  }
}
