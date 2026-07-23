"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, FormInput } from "lucide-react";
import { toast } from "sonner";
import {
  ContentFormBuilderPanel,
  type ContentFormBuilderDraft,
} from "@/components/admin/content-form-builder-panel";
import {
  ContentSectionFormRenderer,
  emptyBillboardFormValues,
  emptyPosterFormValues,
} from "@/components/admin/content-section-form-renderer";
import { createDisplayPeriod } from "@/components/admin/billboard-display-periods-editor";
import { listSectionContentFormsAction } from "@/lib/actions/section-form-actions";
import {
  CONTENT_FORM_SECTION_KEYS,
  contentFormSectionLabels,
  defaultSectionContentForm,
} from "@/lib/section-content-forms";
import type { ContentFormSectionKey, SectionContentForm } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FormsAdminProps {
  campaignId: string;
  canManage: boolean;
}

export function FormsAdmin({ campaignId, canManage }: FormsAdminProps) {
  const [forms, setForms] = useState<SectionContentForm[]>([]);
  const [sectionKey, setSectionKey] = useState<ContentFormSectionKey>("posters");
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<ContentFormBuilderDraft | null>(null);

  const selectedForm = useMemo(() => {
    return (
      forms.find((form) => form.sectionKey === sectionKey) ??
      defaultSectionContentForm(sectionKey)
    );
  }, [forms, sectionKey]);

  const loadForms = useCallback(async () => {
    setLoading(true);
    const result = await listSectionContentFormsAction();
    if (!result.success) {
      toast.error(result.error ?? "بارگذاری فرم‌ها ناموفق بود");
      setLoading(false);
      return;
    }
    setForms(result.forms);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadForms();
  }, [loadForms]);

  const previewFields = draft?.fields ?? selectedForm.fields;

  if (!canManage) {
    return (
      <div className="rounded-xl border bg-muted/20 p-10 text-center space-y-2">
        <FormInput className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="font-medium">دسترسی به ویرایش فرم‌ها ندارید</p>
        <p className="text-sm text-muted-foreground">
          فقط مدیر و کارفرما می‌توانند فرم‌های افزودن محتوا را ویرایش کنند.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">فرم‌ساز محتوا</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          فرم افزودن محتوای هر بخش را ویرایش کنید. پیش‌نمایش زنده در کنار فرم‌ساز نمایش داده می‌شود.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
          در حال بارگذاری...
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            {CONTENT_FORM_SECTION_KEYS.map((key) => {
              const isSelected = key === sectionKey;
              const form = forms.find((item) => item.sectionKey === key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSectionKey(key)}
                  className={cn(
                    "w-full rounded-xl border p-4 text-right transition-colors",
                    isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/30"
                  )}
                >
                  <p className="font-semibold">
                    {form?.title || contentFormSectionLabels[key]}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(form?.fields.length ?? 0) || "پیش‌فرض"} فیلد
                  </p>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border p-4 min-h-[480px]">
            <ContentFormBuilderPanel
              form={selectedForm}
              resetKey={`${selectedForm.sectionKey}:${selectedForm.updatedAt}`}
              onDraftChange={setDraft}
              onSaved={(saved) => {
                setForms((prev) => {
                  const without = prev.filter((item) => item.sectionKey !== saved.sectionKey);
                  return [...without, saved];
                });
                setDraft({ title: saved.title, fields: saved.fields });
              }}
            />
          </div>

          <div className="rounded-xl border p-4 min-h-[480px] bg-muted/10">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">پیش‌نمایش فرم</h2>
              <p className="text-xs text-muted-foreground">
                همان فرمی که هنگام افزودن محتوا در بخش «
                {contentFormSectionLabels[sectionKey]}» دیده می‌شود.
              </p>
            </div>

            {sectionKey === "posters" ? (
              <ContentSectionFormRenderer
                sectionKey="posters"
                fields={previewFields}
                values={{
                  ...emptyPosterFormValues(),
                  title: "نمونه عنوان پوستر",
                }}
                onChange={() => undefined}
                campaignId={campaignId}
                isNew
                readOnly
              />
            ) : (
              <ContentSectionFormRenderer
                sectionKey="billboards"
                fields={previewFields}
                values={{
                  ...emptyBillboardFormValues(),
                  axis: "نمونه محور",
                  periods: [createDisplayPeriod()],
                }}
                onChange={() => undefined}
                campaignId={campaignId}
                isNew
                readOnly
                showAdminNotes
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
