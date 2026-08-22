"use client";

import { useMemo, useState, useTransition } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  AdminCompactAddCard,
  ADMIN_CONTENT_GRID_CLASS,
  AdminEmptyCreateState,
} from "@/components/admin/admin-compact-add-card";
import { AdminOwnerBadge } from "@/components/admin/admin-owner-badge";
import { AdminPlanLabelsBadges } from "@/components/admin/admin-plan-labels-badges";
import { AdminViewModeToggle } from "@/components/admin/admin-view-mode-toggle";
import { AdminItemActions } from "@/components/admin/admin-item-actions";
import {
  AdminContentFilterBar,
  collectAdminFilterUsers,
  DEFAULT_ADMIN_CONTENT_FILTER,
  matchesAdminContentFilter,
  type AdminContentFilterState,
} from "@/components/admin/admin-content-filter-bar";
import {
  BulkItemShell,
  SectionBulkEditBar,
  useSectionBulkEdit,
} from "@/components/admin/section-bulk-edit";
import { PlanLabelSelect } from "@/components/admin/plan-label-select";
import { ContentScoreControl } from "@/components/admin/content-score-control";
import {
  AdminEditorDialog,
  AdminEditorDialogActions,
} from "@/components/admin/admin-editor-dialog";
import { DocumentUpload } from "@/components/ui/document-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteCampaignFileAction, saveCampaignFileAction } from "@/lib/actions/admin-actions";
import { CONTENT_TITLE_MAX_LENGTH } from "@/lib/content-constraints";
import type { ContentTopic } from "@/lib/content-topics";
import { isDefaultFileTitle, type EditSuggestionMissingField } from "@/lib/edit-suggestions";
import { useAdminEditDeepLink } from "@/lib/hooks/use-admin-edit-deep-link";
import { useInvalidFormFields } from "@/lib/hooks/use-invalid-form-fields";
import { useSectionCreateGate } from "@/lib/hooks/use-section-create-gate";
import { useAdminViewMode } from "@/lib/hooks/use-admin-view-mode";
import { useAdminInfiniteScroll } from "@/lib/hooks/use-admin-infinite-scroll";
import { AdminInfiniteScrollSentinel } from "@/components/admin/admin-infinite-scroll-sentinel";
import type { AdminUser, CampaignFile } from "@/lib/types";
import { cn, formatPersianNumber } from "@/lib/utils";

interface FilesAdminProps {
  campaignId: string;
  initialFiles: CampaignFile[];
  contentPlans?: string[];
  contentTopics?: ContentTopic[];
  canScore?: boolean;
  isFullAdmin?: boolean;
  users?: AdminUser[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${formatPersianNumber(bytes)} B`;
  if (bytes < 1024 * 1024) return `${formatPersianNumber(Math.round(bytes / 1024))} KB`;
  return `${formatPersianNumber(Math.round(bytes / (1024 * 1024)))} MB`;
}

function fileIcon(mimeType: string) {
  if (mimeType.includes("sheet") || mimeType.includes("excel")) {
    return FileSpreadsheet;
  }
  return FileText;
}

export function FilesAdmin({
  campaignId,
  initialFiles,
  contentPlans = [],
  contentTopics = [],
  canScore = false,
  isFullAdmin = false,
  users = [],
}: FilesAdminProps) {
  const { requestCreate, tutorialModal } = useSectionCreateGate("files", campaignId);
  const [files, setFiles] = useState(initialFiles);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const { reportInvalid, clearInvalid, isFieldInvalid } = useInvalidFormFields();
  const [description, setDescription] = useState("");
  const [planLabels, setPlanLabels] = useState<string[]>([]);
  const [contentFilter, setContentFilter] = useState<AdminContentFilterState>(DEFAULT_ADMIN_CONTENT_FILTER);
  const { viewMode, setViewMode } = useAdminViewMode("files");
  const [upload, setUpload] = useState({
    url: "",
    fileName: "",
    fileSize: 0,
    mimeType: "",
  });
  const [isPending, startTransition] = useTransition();

  const filterUsers = useMemo(() => collectAdminFilterUsers(files), [files]);
  const filteredFiles = useMemo(
    () => files.filter((item) => matchesAdminContentFilter(item, contentFilter)),
    [files, contentFilter]
  );
  const paginationResetKey = `${contentFilter.userKey}:${contentFilter.planLabels.join(",")}:${viewMode}`;
  const { visibleCount, hasMore, isLoadingMore, loadMore } = useAdminInfiniteScroll(
    filteredFiles.length,
    paginationResetKey
  );
  const visibleFiles = useMemo(
    () => filteredFiles.slice(0, visibleCount),
    [filteredFiles, visibleCount]
  );
  const visibleIds = useMemo(() => visibleFiles.map((item) => item.id), [visibleFiles]);
  const bulk = useSectionBulkEdit(visibleIds);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setPlanLabels([]);
    setUpload({ url: "", fileName: "", fileSize: 0, mimeType: "" });
  };

  const { highlightFields, setHighlightFields, resetDeepLink } = useAdminEditDeepLink({
    items: files,
    getId: (file) => file.id,
    basePath: "/admin/files",
    onOpen: (file, fields) => {
      setEditingId(file.id);
      setTitle(file.title);
      setDescription(file.description ?? "");
      setPlanLabels(
        file.planLabels?.length ? file.planLabels : file.planLabel ? [file.planLabel] : []
      );
      setUpload({
        url: file.fileUrl,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
      });
      setHighlightFields(fields);
      setDialogOpen(true);
    },
  });

  const openCreate = () => {
    void requestCreate(() => {
      resetForm();
      setHighlightFields([]);
      setDialogOpen(true);
    });
  };

  const openEdit = (file: CampaignFile, fields: EditSuggestionMissingField[] = []) => {
    setEditingId(file.id);
    setTitle(file.title);
    setDescription(file.description ?? "");
    setPlanLabels(file.planLabels?.length ? file.planLabels : file.planLabel ? [file.planLabel] : []);
    setUpload({
      url: file.fileUrl,
      fileName: file.fileName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
    });
    setHighlightFields(fields);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    resetForm();
    resetDeepLink();
    clearInvalid();
  };

  const highlightTitle =
    isFieldInvalid("title", !title.trim()) ||
    (highlightFields.includes("title") && (isDefaultFileTitle(title) || !title.trim()));
  const highlightPlanLabels = isFieldInvalid("planLabels", planLabels.length === 0);
  const highlightFile =
    isFieldInvalid("file", !upload.url) ||
    (highlightFields.includes("file") && !upload.url);
  const highlightDescription = highlightFields.includes("description") && !description.trim();

  const handleSave = () => {
    const invalid: string[] = [];
    if (!title.trim()) invalid.push("title");
    if (planLabels.length === 0) invalid.push("planLabels");
    if (!upload.url) invalid.push("file");
    if (invalid.length > 0) {
      reportInvalid(invalid);
      return;
    }
    clearInvalid();

    startTransition(async () => {
      const result = await saveCampaignFileAction({
        id: editingId ?? undefined,
        campaignId,
        title: title.trim(),
        description: description.trim() || undefined,
        fileUrl: upload.url,
        fileName: upload.fileName,
        fileSize: upload.fileSize,
        mimeType: upload.mimeType,
        published: true,
        sortOrder: editingId
          ? files.find((item) => item.id === editingId)?.sortOrder ?? files.length + 1
          : files.length + 1,
        planLabels,
        planLabel: planLabels[0] ?? null,
      });

      if (!result.success) {
        toast.error("ذخیره فایل ناموفق بود");
        return;
      }

      const savedId =
        "id" in result && typeof result.id === "string" && result.id
          ? result.id
          : editingId;
      if (!savedId) {
        toast.error("ذخیره فایل ناموفق بود");
        return;
      }

      const now = new Date().toISOString();
      const nextFile: CampaignFile = {
        id: savedId,
        campaignId,
        title: title.trim(),
        description: description.trim() || null,
        fileUrl: upload.url,
        fileName: upload.fileName,
        fileSize: upload.fileSize,
        mimeType: upload.mimeType,
        published: true,
        sortOrder: editingId
          ? files.find((item) => item.id === editingId)?.sortOrder ?? files.length + 1
          : files.length + 1,
        planLabels,
        planLabel: planLabels[0] ?? null,
        score: editingId ? files.find((item) => item.id === editingId)?.score : undefined,
        ownerUserId: editingId ? files.find((item) => item.id === editingId)?.ownerUserId : undefined,
        ownerName: editingId ? files.find((item) => item.id === editingId)?.ownerName : undefined,
        createdAt: editingId
          ? files.find((item) => item.id === editingId)?.createdAt ?? now
          : now,
        updatedAt: now,
      };

      setFiles((prev) =>
        editingId
          ? prev.map((item) => (item.id === editingId ? { ...item, ...nextFile } : item))
          : [...prev, nextFile]
      );
      toast.success(editingId ? "فایل به‌روزرسانی شد" : "فایل اضافه شد");
      closeDialog();
    });
  };

  const handleDelete = (file: CampaignFile) => {
    startTransition(async () => {
      await deleteCampaignFileAction(file.id);
      setFiles((prev) => prev.filter((item) => item.id !== file.id));
      toast.success("فایل حذف شد");
      closeDialog();
    });
  };

  return (
    <div className="space-y-6">
      {tutorialModal}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">فایل‌های راستا</h1>
          <p className="text-sm text-muted-foreground">
            PDF، Word، Excel و سایر فایل‌های قابل دانلود — با + فایل جدید آپلود کنید
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <AdminContentFilterBar
        filter={contentFilter}
        onChange={setContentFilter}
        users={isFullAdmin ? filterUsers : []}
        plans={contentPlans}
        items={files}
      />

      <SectionBulkEditBar
        campaignId={campaignId}
        contentType="file"
        bulkMode={bulk.bulkMode}
        onBulkModeChange={bulk.setBulkMode}
        selectedIds={[...bulk.selectedIds]}
        visibleCount={visibleFiles.length}
        allVisibleSelected={bulk.allVisibleSelected}
        onToggleAllVisible={bulk.toggleAllVisible}
        onClearSelection={bulk.clearSelection}
        contentPlans={contentPlans}
        contentTopics={contentTopics}
        isFullAdmin={isFullAdmin}
        users={users}
      />

      {filteredFiles.length === 0 ? (
        files.length === 0 ? (
          <AdminEmptyCreateState>
            {!bulk.bulkMode ? (
              <AdminCompactAddCard onClick={openCreate} label="فایل جدید" />
            ) : null}
          </AdminEmptyCreateState>
        ) : (
          <div className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">
            موردی با این فیلتر پیدا نشد.
          </div>
        )
      ) : viewMode === "list" ? (
        <div className="space-y-3">
          {!bulk.bulkMode && (
            <div className="max-w-[10rem]">
              <AdminCompactAddCard onClick={openCreate} label="فایل جدید" />
            </div>
          )}
          <div className="overflow-hidden rounded-xl border">
          {visibleFiles.map((file) => (
            <div
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <div className="flex min-w-0 items-start gap-3">
                {bulk.bulkMode && (
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={bulk.isSelected(file.id)}
                    onChange={() => bulk.toggle(file.id)}
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">{file.title}</p>
                  <p className="text-xs text-muted-foreground">{file.fileName}</p>
                  <AdminPlanLabelsBadges
                    planLabels={file.planLabels}
                    planLabel={file.planLabel}
                    className="mt-1"
                  />
                </div>
              </div>
              {!bulk.bulkMode && (
                <AdminItemActions
                  onView={() => window.open(file.fileUrl, "_blank")}
                  onEdit={() => openEdit(file)}
                  onDelete={() => handleDelete(file)}
                  deleteLabel="این فایل"
                />
              )}
            </div>
          ))}
          </div>
        </div>
      ) : (
        <div className={ADMIN_CONTENT_GRID_CLASS}>
          {!bulk.bulkMode && <AdminCompactAddCard onClick={openCreate} label="فایل جدید" />}
          {visibleFiles.map((file) => {
            const Icon = fileIcon(file.mimeType);
            return (
              <BulkItemShell
                key={file.id}
                enabled={bulk.bulkMode}
                selected={bulk.isSelected(file.id)}
                onToggle={() => bulk.toggle(file.id)}
              >
                <div className="relative overflow-hidden rounded-xl border bg-card">
                  <button
                    type="button"
                    onClick={() => openEdit(file)}
                    className="flex w-full flex-col gap-2 p-3 text-right"
                  >
                    <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <p className="truncate text-sm font-medium">{file.title}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{file.fileName}</p>
                    <p className="text-[10px] text-muted-foreground">{formatFileSize(file.fileSize)}</p>
                    <AdminPlanLabelsBadges
                      planLabels={file.planLabels}
                      planLabel={file.planLabel}
                    />
                    <AdminOwnerBadge ownerUserId={file.ownerUserId} ownerName={file.ownerName} />
                  </button>
                  {(canScore || file.score != null) && (
                    <div className="px-3 pb-2">
                      <ContentScoreControl
                        campaignId={campaignId}
                        contentType="file"
                        contentId={file.id}
                        score={file.score}
                        autoScore={file.autoScore}
                        manualScore={file.manualScore}
                        canScore={canScore}
                        compact
                        onScoreSaved={(score) =>
                          setFiles((prev) =>
                            prev.map((item) => (item.id === file.id ? { ...item, score } : item))
                          )
                        }
                      />
                    </div>
                  )}
                  {!bulk.bulkMode && (
                    <div className="absolute bottom-2 left-2 z-10">
                      <AdminItemActions
                        compact
                        onView={() => window.open(file.fileUrl, "_blank")}
                        onEdit={() => openEdit(file)}
                        onDelete={() => handleDelete(file)}
                        deleteLabel="این فایل"
                      />
                    </div>
                  )}
                </div>
              </BulkItemShell>
            );
          })}
        </div>
      )}

      <AdminInfiniteScrollSentinel
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        remaining={filteredFiles.length - visibleCount}
      />

      <AdminEditorDialog
        open={dialogOpen}
        onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}
        title={editingId ? "ویرایش فایل" : "افزودن فایل"}
        description="آپلود فایل PDF، Word، Excel یا متنی برای راستا"
        footer={
          <AdminEditorDialogActions
            saveLabel="ذخیره فایل"
            isPending={isPending}
            onSave={handleSave}
            onDelete={
              editingId
                ? () => {
                    const current = files.find((item) => item.id === editingId);
                    if (current) handleDelete(current);
                  }
                : undefined
            }
            deleteLabel="حذف فایل"
          />
        }
      >
        <div data-field="title" className="space-y-2">
          <Label className={cn(highlightTitle && "text-destructive")}>عنوان</Label>
          <Input
            value={title}
            maxLength={CONTENT_TITLE_MAX_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="عنوان فایل"
            className={cn(highlightTitle && "border-destructive focus-visible:ring-destructive")}
          />
          {highlightTitle && !title.trim() ? (
            <p className="text-xs text-destructive">عنوان را وارد کنید.</p>
          ) : null}
          {highlightTitle && title.trim() ? (
            <p className="text-xs text-destructive">
              عنوان پیش‌فرض یا خالی است؛ یک عنوان اختصاصی وارد کنید.
            </p>
          ) : null}
        </div>
        <PlanLabelSelect
          topics={contentTopics}
          plans={contentPlans}
          values={planLabels}
          onChangeMultiple={setPlanLabels}
          invalid={highlightPlanLabels}
        />
        <div className="space-y-2">
          <Label className={cn(highlightDescription && "text-amber-700 dark:text-amber-300")}>
            توضیحات (اختیاری)
          </Label>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            className={cn(
              highlightDescription && "border-amber-500 focus-visible:ring-amber-500"
            )}
          />
          {highlightDescription && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              توضیحات خالی است؛ بهتر است تکمیل شود.
            </p>
          )}
        </div>
        <div
          data-field="file"
          className={cn(
            highlightFile && "rounded-lg border border-destructive bg-destructive/5 p-3"
          )}
        >
          <DocumentUpload
            label="فایل"
            value={upload.url}
            fileName={upload.fileName}
            fileSize={upload.fileSize}
            mimeType={upload.mimeType}
            onChange={setUpload}
            disabled={isPending}
          />
          {highlightFile && (
            <p className="mt-2 text-xs text-destructive">فایل هنوز آپلود نشده است.</p>
          )}
        </div>
      </AdminEditorDialog>
    </div>
  );
}
