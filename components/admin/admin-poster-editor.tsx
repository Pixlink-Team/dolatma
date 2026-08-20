"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ContentSectionFormRenderer,
  type PosterSectionFormValues,
} from "@/components/admin/content-section-form-renderer";
import {
  deletePosterAction,
  deletePosterVersionAction,
  savePosterAction,
  savePosterVersionAction,
} from "@/lib/actions/admin-actions";
import { getSectionContentFormAction } from "@/lib/actions/section-form-actions";
import { normalizePlanLabels, type ContentTopic } from "@/lib/content-topics";
import {
  defaultContentFormFields,
  fieldByWidget,
  parseMetadataObject,
} from "@/lib/section-content-forms";
import {
  isDefaultPosterTitle,
  type EditSuggestionMissingField,
} from "@/lib/edit-suggestions";
import { todayISO } from "@/lib/jalali";
import { resolveDisplayVersion } from "@/lib/media-utils";
import type { ContentFormField, MediaCategory, Poster, PosterVersion } from "@/lib/types";

interface AdminPosterEditorProps {
  poster: Poster;
  versions: PosterVersion[];
  categories: MediaCategory[];
  contentPlans?: string[];
  contentTopics?: ContentTopic[];
  canScore?: boolean;
  isNew?: boolean;
  highlightFields?: EditSuggestionMissingField[];
  onClose: () => void;
  onSaved?: (poster: Poster) => void;
}

export function AdminPosterEditor({
  poster,
  versions,
  contentPlans = [],
  contentTopics = [],
  canScore = false,
  isNew = false,
  highlightFields = [],
  onClose,
  onSaved,
}: AdminPosterEditorProps) {
  const router = useRouter();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [fields, setFields] = useState<ContentFormField[]>(() =>
    defaultContentFormFields("posters")
  );
  const [fieldsLoaded, setFieldsLoaded] = useState(false);

  const displayVersion = useMemo(() => resolveDisplayVersion(versions), [versions]);

  const [values, setValues] = useState<PosterSectionFormValues>(() => ({
    imageUrl: displayVersion?.imageUrl || "",
    title: poster.title,
    description: poster.description ?? "",
    planLabels: normalizePlanLabels(poster.planLabels, poster.planLabel),
    notes: displayVersion?.notes ?? "",
    score: poster.score,
    metadata: parseMetadataObject(poster.metadata),
  }));
  const [editCategoryId, setEditCategoryId] = useState(poster.categoryId);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getSectionContentFormAction("posters");
      if (cancelled) return;
      if (result.success) {
        setFields(result.form.fields);
      }
      setFieldsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const current = resolveDisplayVersion(versions);
    setValues({
      imageUrl: current?.imageUrl || "",
      title: poster.title,
      description: poster.description ?? "",
      planLabels: normalizePlanLabels(poster.planLabels, poster.planLabel),
      notes: current?.notes ?? "",
      score: poster.score,
      metadata: parseMetadataObject(poster.metadata),
    });
    setEditCategoryId(poster.categoryId);
  }, [
    poster.id,
    poster.title,
    poster.description,
    poster.categoryId,
    poster.planLabel,
    poster.planLabels,
    poster.score,
    poster.metadata,
    versions,
  ]);

  const refresh = () => router.refresh();

  const patchValues = (patch: Partial<PosterSectionFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
  };

  const handleSaveAll = () => {
    const imageField = fieldByWidget(fields, "image");
    if (imageField?.required !== false && !values.imageUrl.trim()) {
      toast.error("تصویر پوستر لازم است");
      return;
    }

    const titleField = fieldByWidget(fields, "title");
    if (titleField?.required && !values.title.trim()) {
      toast.error(`فیلد «${titleField.label}» الزامی است`);
      return;
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
      const savedPoster: Poster = {
        ...poster,
        title: values.title.trim(),
        description: values.description,
        categoryId: editCategoryId,
        published: true,
        planLabels: values.planLabels,
        planLabel: values.planLabels[0] ?? null,
        score: values.score,
        metadata: values.metadata,
        updatedAt: new Date().toISOString(),
      };

      await savePosterAction(savedPoster);

      const keepId = displayVersion?.id;
      await savePosterVersionAction({
        id: keepId,
        posterId: poster.id,
        versionNumber: displayVersion?.versionNumber ?? 1,
        imageUrl: values.imageUrl,
        thumbnailUrl: values.imageUrl,
        notes: values.notes || undefined,
        date: displayVersion?.date ?? todayISO(),
        isFinal: true,
        status: "final",
      });

      for (const version of versions) {
        if (version.id !== keepId) {
          await deletePosterVersionAction(version.id);
        }
      }

      toast.success("ذخیره شد");
      onSaved?.(savedPoster);
      refresh();
    });
  };

  const handleDeletePoster = () => {
    if (isNew) {
      onClose();
      return;
    }
    setConfirmDeleteOpen(true);
  };

  const confirmDeletePoster = () => {
    setConfirmDeleteOpen(false);
    startTransition(async () => {
      await deletePosterAction(poster.id);
      toast.success("پوستر حذف شد");
      onClose();
      refresh();
    });
  };

  const highlightTitle =
    highlightFields.includes("title") &&
    (isDefaultPosterTitle(values.title) || !values.title.trim());
  const highlightDescription =
    highlightFields.includes("description") && !values.description.trim();
  const highlightMedia =
    highlightFields.includes("media") && !values.imageUrl.trim();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollAreaRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain px-6"
      >
        {!fieldsLoaded ? (
          <p className="text-sm text-muted-foreground">در حال بارگذاری فرم...</p>
        ) : (
          <div className="min-w-0">
            <ContentSectionFormRenderer
              sectionKey="posters"
              fields={fields}
              values={values}
              onChange={patchValues}
              contentTopics={contentTopics}
              contentPlans={contentPlans}
              campaignId={poster.campaignId}
              contentId={poster.id}
              canScore={canScore}
              isNew={isNew}
              highlightTitle={highlightTitle}
              highlightDescription={highlightDescription}
              highlightMedia={highlightMedia}
            />
            {highlightMedia ? (
              <p className="mt-2 text-xs text-destructive">
                تصویر پوستر هنوز آپلود نشده است.
              </p>
            ) : null}
            {highlightTitle ? (
              <p className="mt-2 text-xs text-destructive">
                عنوان پیش‌فرض است؛ یک عنوان اختصاصی وارد کنید.
              </p>
            ) : null}
            {highlightDescription ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                توضیحات خالی است؛ بهتر است تکمیل شود.
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t bg-card px-6 pt-3">
        <Button onClick={handleSaveAll} disabled={isPending || !fieldsLoaded} className="flex-1">
          {isPending ? "در حال ذخیره..." : "ذخیره"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleDeletePoster}
          disabled={isPending}
          aria-label={isNew ? "بستن" : "حذف پوستر"}
          title={isNew ? "بستن" : "حذف"}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف پوستر</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف «{poster.title || "این پوستر"}» مطمئن هستید؟ این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePoster}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
