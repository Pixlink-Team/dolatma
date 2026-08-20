"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CONTENT_TITLE_MAX_LENGTH,
  CONTENT_TITLE_MAX_LENGTH_MESSAGE,
} from "@/lib/content-constraints";
import { FileText, ImageIcon, Music, Play, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AdminEditorDialog,
  AdminEditorDialogActions,
} from "@/components/admin/admin-editor-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AdminBroadcastAddCard,
  AdminBroadcastCompactCard,
} from "@/components/admin/admin-broadcast-compact-card";
import {
  ADMIN_CONTENT_GRID_CLASS,
  AdminEmptyCreateState,
} from "@/components/admin/admin-compact-add-card";
import { AdminCreatedAtText } from "@/components/admin/admin-created-at";
import {
  AdminContentFilterBar,
  DEFAULT_ADMIN_CONTENT_FILTER,
  sortAdminContentItems,
  type AdminContentFilterState,
} from "@/components/admin/admin-content-filter-bar";
import { AdminItemActions } from "@/components/admin/admin-item-actions";
import { AdminViewModeToggle } from "@/components/admin/admin-view-mode-toggle";
import { DocumentUpload } from "@/components/ui/document-upload";
import { MediaUpload } from "@/components/ui/media-upload";
import { ImageZoom } from "@/components/ui/image-zoom";
import { VideoModal } from "@/components/media/video-modal";
import { VideoThumbnail } from "@/components/media/video-thumbnail";
import { PersianDateField } from "@/components/ui/persian-date-input";
import { ProductionSourcePicker } from "@/components/admin/production-source-picker";
import { deleteBroadcastReportAction, saveBroadcastReportAction } from "@/lib/actions/extended-actions";
import {
  resolveBroadcastFileKind,
  resolveBroadcastMediaType,
  type BroadcastFileKind,
  type BroadcastMediaType,
} from "@/lib/broadcast-media";
import { useAdminEditDeepLink } from "@/lib/hooks/use-admin-edit-deep-link";
import { useAdminViewMode } from "@/lib/hooks/use-admin-view-mode";
import { useSectionCreateGate } from "@/lib/hooks/use-section-create-gate";
import { todayISO } from "@/lib/jalali";
import type { ProductionSourceType } from "@/lib/production-source-shared";
import type { BroadcastReport, VideoVersion } from "@/lib/types";
import { cn, formatPersianDate } from "@/lib/utils";

const MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/aac,audio/ogg,.mp3,.wav,.m4a,.aac,.ogg";

const schema = z.object({
  title: z.string().min(1).max(CONTENT_TITLE_MAX_LENGTH, CONTENT_TITLE_MAX_LENGTH_MESSAGE),
  reportDate: z.string(),
  mediaType: z.enum(["pdf", "media"]),
  pdfUrl: z.string().min(1),
  fileName: z.string().min(1),
  coverImageUrl: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface BroadcastAdminProps {
  campaignId: string;
  initialReports: BroadcastReport[];
}

function emptyFormValues(): FormValues {
  return {
    title: "",
    reportDate: todayISO(),
    mediaType: "media",
    pdfUrl: "",
    fileName: "",
    coverImageUrl: "",
  };
}

function reportToFormValues(report: BroadcastReport): FormValues {
  return {
    title: report.title,
    reportDate: report.reportDate,
    mediaType: resolveBroadcastMediaType(report),
    pdfUrl: report.pdfUrl,
    fileName: report.fileName,
    coverImageUrl: report.summaryData.coverImageUrl ?? "",
  };
}

function toBroadcastVideoVersion(report: BroadcastReport): VideoVersion {
  const cover = report.summaryData.coverImageUrl?.trim() || "";
  return {
    id: report.id,
    videoId: report.id,
    versionNumber: 1,
    videoUrl: report.pdfUrl,
    thumbnailUrl: cover,
    status: "final",
    isFinal: true,
    date: report.reportDate,
    createdAt: report.createdAt,
  };
}

function detectFormFileKind(url: string, fileName: string): BroadcastFileKind {
  return (
    resolveBroadcastFileKind({
      pdfUrl: url,
      fileName,
      summaryData: { mediaType: "media" },
    }) ?? "video"
  );
}

export function BroadcastAdmin({ campaignId, initialReports }: BroadcastAdminProps) {
  const { requestCreate, tutorialModal } = useSectionCreateGate("broadcast", campaignId);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sourceProductionType, setSourceProductionType] = useState<ProductionSourceType | null>(null);
  const [sourceProductionId, setSourceProductionId] = useState<string | null>(null);
  const [rows, setRows] = useState(initialReports);
  const [previewReport, setPreviewReport] = useState<BroadcastReport | null>(null);
  const [isPending, startTransition] = useTransition();
  const [contentFilter, setContentFilter] = useState<AdminContentFilterState>(DEFAULT_ADMIN_CONTENT_FILTER);
  const { viewMode, setViewMode } = useAdminViewMode("broadcast");
  const sortedRows = useMemo(
    () =>
      sortAdminContentItems(rows, contentFilter.sortOrder, (item) => item.reportDate || item.updatedAt || item.createdAt),
    [rows, contentFilter.sortOrder]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyFormValues(),
  });

  const { highlightFields, setHighlightFields, resetDeepLink } = useAdminEditDeepLink({
    items: rows,
    getId: (row) => row.id,
    basePath: "/admin/broadcast",
    onOpen: (report, fields) => {
      setEditingId(report.id);
      setSourceProductionType(report.sourceProductionType ?? null);
      setSourceProductionId(report.sourceProductionId ?? null);
      form.reset(reportToFormValues(report));
      setHighlightFields(fields);
      setOpen(true);
    },
  });

  const watchedTitle = form.watch("title");
  const watchedReportDate = form.watch("reportDate");
  const watchedPdfUrl = form.watch("pdfUrl");
  const watchedMediaType = form.watch("mediaType");
  const watchedFileName = form.watch("fileName");
  const watchedCoverImageUrl = form.watch("coverImageUrl");
  const highlightTitle = highlightFields.includes("title") && !watchedTitle?.trim();
  const highlightDate = highlightFields.includes("date") && !watchedReportDate?.trim();
  const highlightFile = highlightFields.includes("file") && !watchedPdfUrl?.trim();
  const formFileKind =
    watchedMediaType === "media" ? detectFormFileKind(watchedPdfUrl, watchedFileName) : null;

  const setMediaType = (nextType: BroadcastMediaType) => {
    const currentType = form.getValues("mediaType");
    if (currentType === nextType) return;
    form.setValue("mediaType", nextType);
    form.setValue("pdfUrl", "");
    form.setValue("fileName", "");
    form.setValue("coverImageUrl", "");
  };

  const openCreate = () => {
    void requestCreate(() => {
      setEditingId(null);
      setSourceProductionType(null);
      setSourceProductionId(null);
      setHighlightFields([]);
      form.reset(emptyFormValues());
      setOpen(true);
    });
  };

  const openEdit = (report: BroadcastReport) => {
    setEditingId(report.id);
    setSourceProductionType(report.sourceProductionType ?? null);
    setSourceProductionId(report.sourceProductionId ?? null);
    setHighlightFields([]);
    form.reset(reportToFormValues(report));
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    resetDeepLink();
  };

  const handleView = (report: BroadcastReport) => {
    if (resolveBroadcastMediaType(report) === "media") {
      setPreviewReport(report);
      return;
    }
    if (report.pdfUrl) window.open(report.pdfUrl, "_blank");
  };

  const handleDelete = (report: BroadcastReport) => {
    startTransition(async () => {
      await deleteBroadcastReportAction(report.id);
      setRows((prev) => prev.filter((row) => row.id !== report.id));
      toast.success("حذف شد");
    });
  };

  const onSubmit = form.handleSubmit((data) => {
    if (!editingId && (!sourceProductionType || !sourceProductionId)) {
      toast.error("برای ثبت نشر باید یک تولید (یا دارایی دستورکار) انتخاب شود");
      return;
    }

    startTransition(async () => {
      const fileKind =
        data.mediaType === "media" ? detectFormFileKind(data.pdfUrl, data.fileName) : null;
      const existingNotes = editingId
        ? rows.find((row) => row.id === editingId)?.summaryData.notes
        : undefined;
      const summaryData = {
        ...(existingNotes ? { notes: existingNotes } : {}),
        mediaType: data.mediaType,
        ...(fileKind === "video" && data.coverImageUrl?.trim()
          ? { coverImageUrl: data.coverImageUrl.trim() }
          : {}),
      };

      const payload = {
        campaignId,
        id: editingId ?? undefined,
        title: data.title,
        reportDate: data.reportDate,
        pdfUrl: data.pdfUrl,
        fileName: data.fileName,
        published: true,
        summaryData,
        sourceProductionType,
        sourceProductionId,
      };

      const result = await saveBroadcastReportAction(payload);
      if (!result.success) {
        toast.error("ذخیره نشد");
        return;
      }

      const savedId = "id" in result ? result.id : (editingId ?? crypto.randomUUID());

      const nextRow: BroadcastReport = {
        id: savedId,
        campaignId,
        title: data.title,
        reportDate: data.reportDate,
        pdfUrl: data.pdfUrl,
        fileName: data.fileName,
        summaryData,
        published: true,
        sortOrder: 0,
        sourceProductionType,
        sourceProductionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setRows((prev) =>
        editingId ? prev.map((row) => (row.id === editingId ? { ...row, ...nextRow } : row)) : [...prev, nextRow]
      );
      toast.success("ذخیره شد");
      closeDialog();
    });
  });

  const previewKind = previewReport ? resolveBroadcastFileKind(previewReport) : null;
  const previewVersion =
    previewReport && previewKind === "video" ? toBroadcastVideoVersion(previewReport) : null;

  return (
    <div className="space-y-6">
      {tutorialModal}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">صدا و سیما</h1>
          <p className="text-sm text-muted-foreground">
            آپلود و انتشار گزارش PDF یا مدیا (تصویر، صوت، ویدیو) — روی کارت کلیک کنید یا با + گزارش جدید بسازید
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <AdminContentFilterBar
        filter={contentFilter}
        onChange={setContentFilter}
        users={[]}
        plans={[]}
      />

      {sortedRows.length === 0 ? (
        <AdminEmptyCreateState message="هنوز گزارشی ثبت نشده است.">
          <AdminBroadcastAddCard onClick={openCreate} />
        </AdminEmptyCreateState>
      ) : viewMode === "grid" ? (
        <div className={ADMIN_CONTENT_GRID_CLASS}>
          <AdminBroadcastAddCard onClick={openCreate} />
          {sortedRows.map((report) => (
            <AdminBroadcastCompactCard
              key={report.id}
              report={report}
              onClick={() => openEdit(report)}
              onView={() => handleView(report)}
              onEdit={() => openEdit(report)}
              onDelete={() => handleDelete(report)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="max-w-[10rem]">
            <AdminBroadcastAddCard compact onClick={openCreate} />
          </div>
          <div className="overflow-hidden rounded-xl border">
          {sortedRows.map((report) => {
            const type = resolveBroadcastMediaType(report);
            const fileKind = resolveBroadcastFileKind(report);
            return (
              <div
                key={report.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                    {type === "media" && fileKind === "video" ? (
                      <>
                        <VideoThumbnail
                          videoUrl={report.pdfUrl}
                          thumbnailUrl={report.summaryData.coverImageUrl}
                          alt={report.title}
                          className="object-cover"
                          sizes="96px"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <Play className="h-5 w-5 text-white" />
                        </div>
                      </>
                    ) : type === "media" && fileKind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={report.pdfUrl}
                        alt={report.title}
                        className="h-full w-full object-cover"
                      />
                    ) : type === "media" && fileKind === "audio" ? (
                      <div className="flex h-full items-center justify-center">
                        <Music className="h-5 w-5 text-primary" />
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{report.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatPersianDate(report.reportDate)}
                      {report.fileName ? ` · ${report.fileName}` : ""}
                    </p>
                    <AdminCreatedAtText createdAt={report.createdAt} className="text-xs" />
                  </div>
                </div>
                <AdminItemActions
                  onView={() => handleView(report)}
                  onEdit={() => openEdit(report)}
                  onDelete={() => handleDelete(report)}
                />
              </div>
            );
          })}
          </div>
        </div>
      )}

      <AdminEditorDialog
        open={open}
        onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeDialog())}
        title={editingId ? "ویرایش گزارش" : "گزارش جدید"}
        description="آپلود و انتشار گزارش PDF یا مدیا برای صدا و سیما"
        pinTop
        formProps={{ onSubmit }}
        footer={<AdminEditorDialogActions submit isPending={isPending} />}
      >
        <ProductionSourcePicker
          campaignId={campaignId}
          valueType={sourceProductionType}
          valueId={sourceProductionId}
          required={!editingId}
          label="کدام تولید را نشر می‌کنید؟"
          onChange={(item) => {
            setSourceProductionType(item?.type ?? null);
            setSourceProductionId(item?.id ?? null);
          }}
        />
            <div className="space-y-2">
              <Label className={cn(highlightTitle && "text-destructive")}>عنوان گزارش</Label>
              <Input
                {...form.register("title")}
                maxLength={CONTENT_TITLE_MAX_LENGTH}
                placeholder="مثلاً گزارش روزانه پخش"
                className={cn(highlightTitle && "border-destructive focus-visible:ring-destructive")}
              />
              {highlightTitle && (
                <p className="text-xs text-destructive">عنوان خالی است؛ لطفاً تکمیل کنید.</p>
              )}
            </div>

            <div className={cn(highlightDate && "rounded-lg border border-destructive bg-destructive/5 p-3")}>
              <PersianDateField control={form.control} name="reportDate" label="تاریخ گزارش" />
              {highlightDate && (
                <p className="mt-1 text-xs text-destructive">تاریخ گزارش خالی است؛ لطفاً انتخاب کنید.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>نوع فایل</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={watchedMediaType === "pdf" ? "default" : "outline"}
                  onClick={() => setMediaType("pdf")}
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
                <Button
                  type="button"
                  variant={watchedMediaType === "media" ? "default" : "outline"}
                  onClick={() => setMediaType("media")}
                >
                  <ImageIcon className="h-4 w-4" />
                  مدیا
                </Button>
              </div>
            </div>

            <div
              className={cn(
                highlightFile && "rounded-lg border border-destructive bg-destructive/5 p-3"
              )}
            >
              {watchedMediaType === "media" ? (
                <MediaUpload
                  label="فایل مدیا (تصویر، صوت یا ویدیو)"
                  kind="image"
                  accept={MEDIA_ACCEPT}
                  maxFileSizeBytes={100 * 1024 * 1024}
                  fileOnly
                  value={watchedPdfUrl}
                  coverImageUrl={watchedCoverImageUrl}
                  onChange={(url) => form.setValue("pdfUrl", url, { shouldDirty: true, shouldValidate: true })}
                  onCoverImageUrlChange={(url) =>
                    form.setValue("coverImageUrl", url, { shouldDirty: true })
                  }
                  onUploadedMeta={(meta) => {
                    form.setValue("pdfUrl", meta.url, { shouldDirty: true, shouldValidate: true });
                    form.setValue("fileName", meta.fileName || "broadcast-media", { shouldDirty: true });
                    if (!form.getValues("title")) {
                      form.setValue(
                        "title",
                        meta.fileName?.replace(
                          /\.(mp4|webm|mov|ogg|mp3|wav|m4a|aac|jpe?g|png|webp|gif)$/i,
                          ""
                        ) ?? "مدیا پخش",
                        { shouldDirty: true }
                      );
                    }
                  }}
                  showPreview={false}
                  showLinkInput={false}
                  dropzoneContent={
                    <div
                      className={cn(
                        "relative aspect-video w-full overflow-hidden rounded-[10px] bg-muted",
                        highlightFile && "ring-2 ring-destructive ring-offset-2"
                      )}
                    >
                      {watchedPdfUrl ? (
                        formFileKind === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={watchedPdfUrl}
                            alt={watchedTitle || "تصویر"}
                            className="h-full w-full object-contain"
                          />
                        ) : formFileKind === "audio" ? (
                          <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
                            <Music className="h-10 w-10 text-primary" />
                            <audio
                              key={watchedPdfUrl}
                              src={watchedPdfUrl}
                              controls
                              className="w-full max-w-sm"
                              preload="metadata"
                            />
                          </div>
                        ) : watchedCoverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={watchedCoverImageUrl}
                            alt={watchedTitle || "ویدیو"}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <video
                            key={watchedPdfUrl}
                            src={watchedPdfUrl}
                            className="h-full w-full object-contain"
                            controls
                            playsInline
                            preload="metadata"
                          />
                        )
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-8 w-8" />
                            <Music className="h-8 w-8" />
                            <Video className="h-8 w-8" />
                          </div>
                          <span className="text-sm">تصویر، صوت یا ویدیو را بکشید و رها کنید یا انتخاب کنید</span>
                          <span className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                            <Upload className="h-3.5 w-3.5" />
                            انتخاب مدیا
                          </span>
                        </div>
                      )}
                      {watchedPdfUrl && formFileKind === "video" && watchedCoverImageUrl ? (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                          <Play className="h-12 w-12 text-white drop-shadow-lg" />
                        </div>
                      ) : null}
                      {watchedFileName ? (
                        <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[10px] text-white">
                          <span className="block truncate">{watchedFileName}</span>
                        </div>
                      ) : null}
                    </div>
                  }
                />
              ) : (
                <DocumentUpload
                  label="فایل PDF گزارش"
                  value={watchedPdfUrl}
                  fileName={watchedFileName}
                  onChange={(payload) => {
                    form.setValue("pdfUrl", payload.url, { shouldDirty: true, shouldValidate: true });
                    form.setValue("fileName", payload.fileName || "report.pdf", { shouldDirty: true });
                    form.setValue("coverImageUrl", "");
                    if (!form.getValues("title")) {
                      form.setValue("title", payload.fileName?.replace(/\.pdf$/i, "") ?? "گزارش پخش", {
                        shouldDirty: true,
                      });
                    }
                  }}
                />
              )}
              {highlightFile && (
                <p className="mt-2 text-xs text-destructive">
                  {watchedMediaType === "media"
                    ? "فایل مدیا هنوز آپلود نشده است."
                    : "فایل PDF هنوز آپلود نشده است."}
                </p>
              )}
            </div>

      </AdminEditorDialog>

      {previewVersion && previewReport && previewKind === "video" && (
        <VideoModal
          open={Boolean(previewReport)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setPreviewReport(null);
          }}
          title={previewReport.title}
          versions={[previewVersion]}
          initialVersionId={previewVersion.id}
          description={previewReport.summaryData.notes}
          category="ویدیو پخش"
          createdAt={previewReport.createdAt}
        />
      )}

      {previewReport && previewKind === "image" && (
        <Dialog open onOpenChange={(next) => !next && setPreviewReport(null)}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewReport.title}</DialogTitle>
            </DialogHeader>
            <ImageZoom
              src={previewReport.pdfUrl}
              alt={previewReport.title}
              className="w-full rounded-lg bg-muted"
              imgClassName="max-h-[70vh] w-full object-contain"
            />
          </DialogContent>
        </Dialog>
      )}

      {previewReport && previewKind === "audio" && (
        <Dialog open onOpenChange={(next) => !next && setPreviewReport(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{previewReport.title}</DialogTitle>
            </DialogHeader>
            <audio src={previewReport.pdfUrl} controls className="w-full" preload="metadata" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
