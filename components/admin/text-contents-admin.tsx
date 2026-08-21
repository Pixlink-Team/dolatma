"use client";

import { useMemo, useState, useTransition } from "react";
import { FileText, Newspaper } from "lucide-react";
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
import { AdminInfiniteScrollSentinel } from "@/components/admin/admin-infinite-scroll-sentinel";
import { Badge } from "@/components/ui/badge";
import { DocumentUpload } from "@/components/ui/document-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaThumbnail } from "@/components/ui/media-thumbnail";
import { MediaUpload } from "@/components/ui/media-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { deleteTextContentAction, saveTextContentAction } from "@/lib/actions/admin-actions";
import { CONTENT_TITLE_MAX_LENGTH } from "@/lib/content-constraints";
import type { ContentTopic } from "@/lib/content-topics";
import { type EditSuggestionMissingField } from "@/lib/edit-suggestions";
import { useAdminEditDeepLink } from "@/lib/hooks/use-admin-edit-deep-link";
import { useInvalidFormFields } from "@/lib/hooks/use-invalid-form-fields";
import { useSectionCreateGate } from "@/lib/hooks/use-section-create-gate";
import { useAdminViewMode } from "@/lib/hooks/use-admin-view-mode";
import { useAdminInfiniteScroll } from "@/lib/hooks/use-admin-infinite-scroll";
import type { AdminUser, TextContent, TextContentKind } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TextContentsAdminProps {
  campaignId: string;
  initialItems: TextContent[];
  contentPlans?: string[];
  contentTopics?: ContentTopic[];
  canScore?: boolean;
  isFullAdmin?: boolean;
  users?: AdminUser[];
}

function kindLabel(kind: TextContentKind): string {
  return kind === "news" ? "خبر" : "متن";
}

function truncateBody(body: string, max = 120): string {
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export function TextContentsAdmin({
  campaignId,
  initialItems,
  contentPlans = [],
  contentTopics = [],
  canScore = false,
  isFullAdmin = false,
  users = [],
}: TextContentsAdminProps) {
  const { requestCreate, tutorialModal } = useSectionCreateGate("textContents", campaignId);
  const [items, setItems] = useState(initialItems);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contentKind, setContentKind] = useState<TextContentKind>("news");
  const [title, setTitle] = useState("");
  const { reportInvalid, clearInvalid, isFieldInvalid } = useInvalidFormFields();
  const [body, setBody] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [attachment, setAttachment] = useState({
    url: "",
    fileName: "",
    fileSize: 0,
    mimeType: "",
  });
  const [planLabels, setPlanLabels] = useState<string[]>([]);
  const [contentFilter, setContentFilter] = useState<AdminContentFilterState>(
    DEFAULT_ADMIN_CONTENT_FILTER
  );
  const { viewMode, setViewMode } = useAdminViewMode("text-contents");
  const [isPending, startTransition] = useTransition();

  const filterUsers = useMemo(() => collectAdminFilterUsers(items), [items]);
  const filteredItems = useMemo(
    () => items.filter((item) => matchesAdminContentFilter(item, contentFilter)),
    [items, contentFilter]
  );
  const paginationResetKey = `${contentFilter.userKey}:${contentFilter.planLabels.join(",")}:${viewMode}`;
  const { visibleCount, hasMore, isLoadingMore, loadMore } = useAdminInfiniteScroll(
    filteredItems.length,
    paginationResetKey
  );
  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount]
  );
  const visibleIds = useMemo(() => visibleItems.map((item) => item.id), [visibleItems]);
  const bulk = useSectionBulkEdit(visibleIds);

  const resetForm = () => {
    setEditingId(null);
    setContentKind("news");
    setTitle("");
    setBody("");
    setDescription("");
    setCoverImageUrl("");
    setAttachment({ url: "", fileName: "", fileSize: 0, mimeType: "" });
    setPlanLabels([]);
  };

  const { highlightFields, setHighlightFields, resetDeepLink } = useAdminEditDeepLink({
    items,
    getId: (item) => item.id,
    basePath: "/admin/text-contents",
    onOpen: (item, fields) => {
      setEditingId(item.id);
      setContentKind(item.contentKind);
      setTitle(item.title);
      setBody(item.body);
      setDescription(item.description ?? "");
      setCoverImageUrl(item.coverImageUrl ?? "");
      setAttachment({
        url: item.attachmentUrl ?? "",
        fileName: item.attachmentFileName ?? "",
        fileSize: 0,
        mimeType: "",
      });
      setPlanLabels(
        item.planLabels?.length ? item.planLabels : item.planLabel ? [item.planLabel] : []
      );
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

  const openEdit = (item: TextContent, fields: EditSuggestionMissingField[] = []) => {
    setEditingId(item.id);
    setContentKind(item.contentKind);
    setTitle(item.title);
    setBody(item.body);
    setDescription(item.description ?? "");
    setCoverImageUrl(item.coverImageUrl ?? "");
    setAttachment({
      url: item.attachmentUrl ?? "",
      fileName: item.attachmentFileName ?? "",
      fileSize: 0,
      mimeType: "",
    });
    setPlanLabels(
      item.planLabels?.length ? item.planLabels : item.planLabel ? [item.planLabel] : []
    );
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
    (highlightFields.includes("title") && !title.trim());
  const highlightPlanLabels = isFieldInvalid("planLabels", planLabels.length === 0);
  const highlightBody = isFieldInvalid("body", !body.trim());
  const highlightDescription = highlightFields.includes("description") && !description.trim();

  const handleSave = () => {
    const invalid: string[] = [];
    if (!title.trim()) invalid.push("title");
    if (planLabels.length === 0) invalid.push("planLabels");
    if (!body.trim()) invalid.push("body");
    if (invalid.length > 0) {
      reportInvalid(invalid);
      return;
    }
    clearInvalid();

    startTransition(async () => {
      const existing = editingId ? items.find((item) => item.id === editingId) : undefined;
      const result = await saveTextContentAction({
        id: editingId ?? undefined,
        campaignId,
        contentKind,
        title: title.trim(),
        body: body.trim(),
        description: description.trim() || undefined,
        coverImageUrl: coverImageUrl.trim() || null,
        attachmentUrl: attachment.url.trim() || null,
        attachmentFileName: attachment.fileName.trim() || null,
        published: true,
        sortOrder: existing?.sortOrder ?? items.length + 1,
        planLabels,
        planLabel: planLabels[0] ?? null,
      });

      if (!result.success) {
        const message =
          "error" in result && typeof result.error === "string" && result.error
            ? result.error
            : "ذخیره محتوا ناموفق بود";
        toast.error(message);
        return;
      }

      const savedId =
        "id" in result && typeof result.id === "string" && result.id
          ? result.id
          : editingId;
      if (!savedId) {
        toast.error("ذخیره محتوا ناموفق بود");
        return;
      }

      const now = new Date().toISOString();
      const nextItem: TextContent = {
        id: savedId,
        campaignId,
        contentKind,
        title: title.trim(),
        body: body.trim(),
        description: description.trim() || null,
        coverImageUrl: coverImageUrl.trim() || null,
        attachmentUrl: attachment.url.trim() || null,
        attachmentFileName: attachment.fileName.trim() || null,
        published: true,
        sortOrder: existing?.sortOrder ?? items.length + 1,
        planLabels,
        planLabel: planLabels[0] ?? null,
        score: existing?.score,
        autoScore: existing?.autoScore,
        manualScore: existing?.manualScore,
        ownerUserId: existing?.ownerUserId,
        ownerName: existing?.ownerName,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      setItems((prev) =>
        editingId
          ? prev.map((item) => (item.id === editingId ? { ...item, ...nextItem } : item))
          : [...prev, nextItem]
      );
      toast.success(editingId ? "محتوا به‌روزرسانی شد" : "محتوا اضافه شد");
      closeDialog();
    });
  };

  const handleDelete = (item: TextContent) => {
    startTransition(async () => {
      await deleteTextContentAction(item.id);
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      toast.success("محتوا حذف شد");
      closeDialog();
    });
  };

  return (
    <div className="space-y-6">
      {tutorialModal}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">خبر و متن</h1>
          <p className="text-sm text-muted-foreground">
            تولید خبر و محتوای متنی — با + مورد جدید اضافه کنید
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
        items={items}
      />

      <SectionBulkEditBar
        campaignId={campaignId}
        contentType="text_content"
        bulkMode={bulk.bulkMode}
        onBulkModeChange={bulk.setBulkMode}
        selectedIds={[...bulk.selectedIds]}
        visibleCount={visibleItems.length}
        allVisibleSelected={bulk.allVisibleSelected}
        onToggleAllVisible={bulk.toggleAllVisible}
        onClearSelection={bulk.clearSelection}
        contentPlans={contentPlans}
        contentTopics={contentTopics}
        isFullAdmin={isFullAdmin}
        users={users}
      />

      {filteredItems.length === 0 ? (
        items.length === 0 ? (
          <AdminEmptyCreateState message="هنوز خبر یا متنی ثبت نشده است.">
            {!bulk.bulkMode ? (
              <AdminCompactAddCard onClick={openCreate} label="محتوای جدید" />
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
              <AdminCompactAddCard onClick={openCreate} label="محتوای جدید" />
            </div>
          )}
          <div className="overflow-hidden rounded-xl border">
            {visibleItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <div className="flex min-w-0 items-start gap-3">
                  {bulk.bulkMode && (
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={bulk.isSelected(item.id)}
                      onChange={() => bulk.toggle(item.id)}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{item.title}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {kindLabel(item.contentKind)}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {truncateBody(item.body)}
                    </p>
                    <AdminPlanLabelsBadges
                      planLabels={item.planLabels}
                      planLabel={item.planLabel}
                      className="mt-1"
                    />
                  </div>
                </div>
                {!bulk.bulkMode && (
                  <AdminItemActions
                    onEdit={() => openEdit(item)}
                    onDelete={() => handleDelete(item)}
                    deleteLabel="این محتوا"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={ADMIN_CONTENT_GRID_CLASS}>
          {!bulk.bulkMode && <AdminCompactAddCard onClick={openCreate} label="محتوای جدید" />}
          {visibleItems.map((item) => {
            const Icon = item.contentKind === "news" ? Newspaper : FileText;
            return (
              <BulkItemShell
                key={item.id}
                enabled={bulk.bulkMode}
                selected={bulk.isSelected(item.id)}
                onToggle={() => bulk.toggle(item.id)}
              >
                <div className="relative overflow-hidden rounded-xl border bg-card">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="flex w-full flex-col gap-2 p-3 text-right"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                      {item.coverImageUrl ? (
                        <MediaThumbnail
                          src={item.coverImageUrl}
                          alt={item.title}
                          kind="image"
                          objectFit="cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Icon className="h-8 w-8 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {kindLabel(item.contentKind)}
                      </Badge>
                    </div>
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="line-clamp-2 text-[10px] text-muted-foreground">
                      {truncateBody(item.body, 80)}
                    </p>
                    <AdminPlanLabelsBadges
                      planLabels={item.planLabels}
                      planLabel={item.planLabel}
                    />
                    <AdminOwnerBadge ownerUserId={item.ownerUserId} ownerName={item.ownerName} />
                  </button>
                  {(canScore || item.score != null) && (
                    <div className="px-3 pb-2">
                      <ContentScoreControl
                        campaignId={campaignId}
                        contentType="text_content"
                        contentId={item.id}
                        score={item.score}
                        autoScore={item.autoScore}
                        manualScore={item.manualScore}
                        canScore={canScore}
                        compact
                        onScoreSaved={(score) =>
                          setItems((prev) =>
                            prev.map((entry) =>
                              entry.id === item.id ? { ...entry, score } : entry
                            )
                          )
                        }
                      />
                    </div>
                  )}
                  {!bulk.bulkMode && (
                    <div className="absolute bottom-2 left-2 z-10">
                      <AdminItemActions
                        compact
                        onEdit={() => openEdit(item)}
                        onDelete={() => handleDelete(item)}
                        deleteLabel="این محتوا"
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
        remaining={filteredItems.length - visibleCount}
      />

      <AdminEditorDialog
        open={dialogOpen}
        onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}
        title={editingId ? "ویرایش محتوا" : "افزودن خبر / متن"}
        description="خبر یا محتوای متنی را با عنوان، متن و کاور اختیاری ثبت کنید"
        footer={
          <AdminEditorDialogActions
            saveLabel="ذخیره"
            isPending={isPending}
            onSave={handleSave}
            onDelete={
              editingId
                ? () => {
                    const current = items.find((item) => item.id === editingId);
                    if (current) handleDelete(current);
                  }
                : undefined
            }
            deleteLabel="حذف محتوا"
          />
        }
      >
        <div className="space-y-2">
          <Label>نوع محتوا</Label>
          <Select
            value={contentKind}
            onValueChange={(value) => setContentKind(value === "news" ? "news" : "text")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="news">خبر</SelectItem>
              <SelectItem value="text">محتوای متنی</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div data-field="title" className="space-y-2">
          <Label className={cn(highlightTitle && "text-destructive")}>عنوان</Label>
          <Input
            value={title}
            maxLength={CONTENT_TITLE_MAX_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="عنوان خبر یا متن"
            className={cn(highlightTitle && "border-destructive focus-visible:ring-destructive")}
          />
          {highlightTitle && (
            <p className="text-xs text-destructive">عنوان را وارد کنید.</p>
          )}
        </div>
        <PlanLabelSelect
          topics={contentTopics}
          plans={contentPlans}
          values={planLabels}
          onChangeMultiple={setPlanLabels}
          invalid={highlightPlanLabels}
        />
        <div data-field="body" className="space-y-2">
          <Label className={cn(highlightBody && "text-destructive")}>متن</Label>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={8}
            placeholder="متن کامل خبر یا محتوا"
            className={cn(highlightBody && "border-destructive focus-visible:ring-destructive")}
          />
          {highlightBody ? (
            <p className="text-xs text-destructive">متن محتوا را وارد کنید.</p>
          ) : null}
        </div>
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
        <MediaUpload
          label="تصویر کاور (اختیاری)"
          kind="image"
          value={coverImageUrl}
          onChange={setCoverImageUrl}
        />
        <DocumentUpload
          label="پیوست (اختیاری)"
          value={attachment.url}
          fileName={attachment.fileName}
          fileSize={attachment.fileSize}
          mimeType={attachment.mimeType}
          onChange={setAttachment}
          disabled={isPending}
        />
      </AdminEditorDialog>
    </div>
  );
}
