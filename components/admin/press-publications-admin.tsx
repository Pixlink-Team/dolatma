"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CONTENT_TITLE_MAX_LENGTH,
  CONTENT_TITLE_MAX_LENGTH_MESSAGE,
} from "@/lib/content-constraints";
import { Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AdminEditorDialog,
  AdminEditorDialogActions,
} from "@/components/admin/admin-editor-dialog";
import { AdminActivityCompactCard } from "@/components/admin/admin-activity-compact-card";
import {
  AdminCompactAddCard,
  ADMIN_CONTENT_GRID_CLASS,
  AdminEmptyCreateState,
} from "@/components/admin/admin-compact-add-card";
import {
  AdminContentFilterBar,
  collectAdminFilterUsers,
  DEFAULT_ADMIN_CONTENT_FILTER,
  matchesAdminContentFilter,
  type AdminContentFilterState,
} from "@/components/admin/admin-content-filter-bar";
import { AdminContentPreviewDialog } from "@/components/admin/admin-content-preview-dialog";
import { AdminItemActions } from "@/components/admin/admin-item-actions";
import { AdminViewModeToggle } from "@/components/admin/admin-view-mode-toggle";
import { PlanLabelSelect } from "@/components/admin/plan-label-select";
import { ProductionSourcePicker } from "@/components/admin/production-source-picker";
import {
  BulkItemShell,
  SectionBulkEditBar,
  useSectionBulkEdit,
} from "@/components/admin/section-bulk-edit";
import { MediaUpload } from "@/components/ui/media-upload";
import { PersianDateField } from "@/components/ui/persian-date-input";
import { applyVideoCoverToMediaItems } from "@/lib/client/activity-media-cover";
import { getActivityTypeLabel, pressActivityTypeOptions } from "@/lib/activity-types";
import type { ProductionSourceType } from "@/lib/production-source-shared";
import {
  deleteCampaignActivityAction,
  fetchSocialLinkMetricsAction,
  saveCampaignActivityAction,
} from "@/lib/actions/extended-actions";
import { normalizePlanLabels, type ContentTopic } from "@/lib/content-topics";
import { isDefaultActivityTitle, type EditSuggestionMissingField } from "@/lib/edit-suggestions";
import { useAdminEditDeepLink } from "@/lib/hooks/use-admin-edit-deep-link";
import { useInvalidFormFields } from "@/lib/hooks/use-invalid-form-fields";
import { useAdminViewMode } from "@/lib/hooks/use-admin-view-mode";
import { useSectionCreateGate } from "@/lib/hooks/use-section-create-gate";
import { useAdminInfiniteScroll } from "@/lib/hooks/use-admin-infinite-scroll";
import { AdminInfiniteScrollSentinel } from "@/components/admin/admin-infinite-scroll-sentinel";
import { todayISO } from "@/lib/jalali";
import {
  getPressContentTypeLabel,
  isPressContentType,
  isPressPublication,
  PRESS_CONTENT_TYPES,
} from "@/lib/press-publications";
import { cn, formatPersianDate } from "@/lib/utils";
import type { ActivityMediaItem, AdminUser, CampaignActivity, PressContentType } from "@/lib/types";

const ACTIVITY_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const MAX_MEDIA_ITEMS = 10;

const schema = z.object({
  title: z
    .string()
    .min(1, "عنوان الزامی است")
    .max(CONTENT_TITLE_MAX_LENGTH, CONTENT_TITLE_MAX_LENGTH_MESSAGE),
  activityType: z.enum(["magazine", "newspaper"]),
  pressContentType: z.enum([
    "news",
    "news_interview",
    "report",
    "news_report",
    "interview",
    "ad",
    "advertorial",
    "other",
  ]),
  activityDate: z.string(),
  location: z.string().optional(),
  link: z
    .string()
    .optional()
    .refine((value) => !value?.trim() || z.string().url().safeParse(value.trim()).success, {
      message: "لینک معتبر وارد کنید",
    }),
  description: z.string().optional(),
});

function resolvePressContentType(
  value: string | null | undefined
): PressContentType {
  return isPressContentType(value) ? value : "news";
}

interface PressPublicationsAdminProps {
  campaignId: string;
  initialActivities: CampaignActivity[];
  contentPlans?: string[];
  contentTopics?: ContentTopic[];
  isFullAdmin?: boolean;
  users?: AdminUser[];
}

export function PressPublicationsAdmin({
  campaignId,
  initialActivities,
  contentPlans = [],
  contentTopics = [],
  isFullAdmin = false,
  users = [],
}: PressPublicationsAdminProps) {
  const { requestCreate, tutorialModal } = useSectionCreateGate("pressPublications", campaignId);
  const { viewMode, setViewMode } = useAdminViewMode("press-publications");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<ActivityMediaItem[]>([]);
  const [planLabels, setPlanLabels] = useState<string[]>([]);
  const { reportInvalid, clearInvalid, isFieldInvalid } = useInvalidFormFields();
  const [sourceProductionType, setSourceProductionType] = useState<ProductionSourceType | null>(null);
  const [sourceProductionId, setSourceProductionId] = useState<string | null>(null);
  const [rows, setRows] = useState(
    initialActivities.filter((activity) => isPressPublication(activity))
  );
  const [previewActivity, setPreviewActivity] = useState<CampaignActivity | null>(null);
  const [isPending, startTransition] = useTransition();
  const [contentFilter, setContentFilter] = useState<AdminContentFilterState>(DEFAULT_ADMIN_CONTENT_FILTER);
  const filterUsers = useMemo(() => collectAdminFilterUsers(rows), [rows]);
  const filteredRows = useMemo(
    () => rows.filter((item) => matchesAdminContentFilter(item, contentFilter)),
    [rows, contentFilter]
  );
  const paginationResetKey = `press:${contentFilter.userKey}:${contentFilter.planLabels.join(",")}:${viewMode}`;
  const { visibleCount, hasMore, isLoadingMore, loadMore } = useAdminInfiniteScroll(
    filteredRows.length,
    paginationResetKey
  );
  const visibleRows = useMemo(() => filteredRows.slice(0, visibleCount), [filteredRows, visibleCount]);
  const visibleIds = useMemo(() => visibleRows.map((item) => item.id), [visibleRows]);
  const bulk = useSectionBulkEdit(visibleIds);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      activityType: "magazine" as const,
      pressContentType: "news" as const,
      activityDate: todayISO(),
      location: "",
      link: "",
      description: "",
    },
  });

  const primaryImage = useMemo(
    () => mediaItems.find((item) => item.type === "image")?.url ?? null,
    [mediaItems]
  );
  const primaryVideo = useMemo(
    () => mediaItems.find((item) => item.type === "video")?.url ?? null,
    [mediaItems]
  );

  const openCreate = () => {
    void requestCreate(() => {
      setEditingId(null);
      setMediaItems([]);
      setPlanLabels([]);
      setSourceProductionType(null);
      setSourceProductionId(null);
      resetDeepLink();
      form.reset({
        title: "",
        activityType: "magazine",
        pressContentType: "news",
        activityDate: todayISO(),
        location: "",
        link: "",
        description: "",
      });
      setOpen(true);
    });
  };

  const openEdit = (
    activity: CampaignActivity,
    fields: EditSuggestionMissingField[] = []
  ) => {
    setEditingId(activity.id);
    setMediaItems(activity.mediaItems ?? []);
    setPlanLabels(normalizePlanLabels(activity.planLabels, activity.planLabel));
    setSourceProductionType(activity.sourceProductionType ?? null);
    setSourceProductionId(activity.sourceProductionId ?? null);
    form.reset({
      title: activity.title,
      activityType: activity.activityType === "newspaper" ? "newspaper" : "magazine",
      pressContentType: resolvePressContentType(activity.pressContentType),
      activityDate: activity.activityDate,
      location: activity.location,
      link: activity.link ?? "",
      description: activity.description ?? "",
    });
    setHighlightFields(fields);
    setOpen(true);
  };

  const { highlightFields, setHighlightFields, resetDeepLink } = useAdminEditDeepLink({
    items: rows,
    getId: (row) => row.id,
    basePath: "/admin/press-publications",
    onOpen: (activity, fields) => openEdit(activity, fields),
  });

  const watchedTitle = form.watch("title");
  const watchedActivityDate = form.watch("activityDate");
  const watchedLink = form.watch("link");
  const watchedDescription = form.watch("description");
  const hasPressMedia =
    Boolean(watchedLink?.trim()) || mediaItems.some((item) => item.type === "image" && item.url.trim());
  const highlightTitle =
    Boolean(form.formState.errors.title) ||
    isFieldInvalid("title", !watchedTitle?.trim()) ||
    (highlightFields.includes("title") &&
      (!watchedTitle?.trim() || isDefaultActivityTitle(watchedTitle)));
  const highlightPlanLabels = isFieldInvalid("planLabels", planLabels.length === 0);
  const highlightDate = highlightFields.includes("date") && !watchedActivityDate?.trim();
  const highlightMedia = highlightFields.includes("media") && !hasPressMedia;
  const highlightDescription =
    highlightFields.includes("description") && !watchedDescription?.trim();

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setMediaItems([]);
    setPlanLabels([]);
    resetDeepLink();
    clearInvalid();
  };

  const handleDelete = (activity: CampaignActivity) => {
    startTransition(async () => {
      await deleteCampaignActivityAction(activity.id);
      setRows((prev) => prev.filter((row) => row.id !== activity.id));
      toast.success("حذف شد");
      closeDialog();
      setPreviewActivity(null);
    });
  };

  const handleFetchFromLink = () => {
    const link = form.getValues("link")?.trim() ?? "";
    const activityType = form.getValues("activityType");
    if (!link) {
      toast.error("ابتدا لینک را وارد کنید");
      return;
    }

    startTransition(async () => {
      const result = await fetchSocialLinkMetricsAction({
        url: link,
        platform: activityType,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const currentTitle = form.getValues("title")?.trim() ?? "";
      if (!currentTitle && result.title?.trim()) {
        form.setValue("title", result.title.trim());
      }

      const currentDescription = form.getValues("description")?.trim() ?? "";
      if (!currentDescription && result.description?.trim()) {
        form.setValue("description", result.description.trim());
      }

      if (result.coverImageUrl?.trim()) {
        const coverUrl = result.coverImageUrl.trim();
        const hasCoverImage = mediaItems.some(
          (item) => item.type === "image" && item.url.trim()
        );
        if (!hasCoverImage) {
          setMediaItems((prev) => {
            const emptyImage = prev.find((item) => item.type === "image" && !item.url.trim());
            if (emptyImage) {
              return prev.map((item) =>
                item.id === emptyImage.id ? { ...item, url: coverUrl } : item
              );
            }
            if (prev.length >= MAX_MEDIA_ITEMS) return prev;
            return [...prev, { id: crypto.randomUUID(), type: "image" as const, url: coverUrl }];
          });
        }
      }

      if (result.publishedDate) {
        const currentDate = form.getValues("activityDate")?.trim() ?? "";
        if (!currentDate || currentDate === todayISO()) {
          form.setValue("activityDate", result.publishedDate);
        }
      }

      toast.success("اطلاعات صفحه از لینک خوانده شد");
    });
  };

  const addMediaItem = (type: ActivityMediaItem["type"]) => {
    if (mediaItems.length >= MAX_MEDIA_ITEMS) {
      toast.error(`حداکثر ${MAX_MEDIA_ITEMS} فایل مجاز است`);
      return;
    }
    setMediaItems((prev) => [...prev, { id: crypto.randomUUID(), type, url: "" }]);
  };

  const onSubmit = form.handleSubmit(
    (data) => {
    if (!editingId && (!sourceProductionType || !sourceProductionId)) {
      toast.error("برای ثبت نشر باید یک تولید (یا دارایی دستورکار) انتخاب شود");
      return;
    }
    if (planLabels.length === 0) {
      reportInvalid(["planLabels"]);
      return;
    }
    clearInvalid();

    const filledMedia = mediaItems.filter((item) => item.url.trim());
    startTransition(async () => {
      const result = await saveCampaignActivityAction({
        campaignId,
        id: editingId ?? undefined,
        title: data.title,
        activityType: data.activityType,
        pressContentType: data.pressContentType,
        activityDate: data.activityDate,
        location: data.location?.trim() ?? "",
        link: data.link?.trim() || "",
        imageUrl: filledMedia.find((item) => item.type === "image")?.url ?? null,
        videoUrl: filledMedia.find((item) => item.type === "video")?.url ?? null,
        mediaItems: filledMedia,
        description: data.description || null,
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

      const savedId = "id" in result ? result.id : (editingId ?? crypto.randomUUID());
      const nextActivity: CampaignActivity = {
        id: savedId,
        campaignId,
        title: data.title,
        activityType: data.activityType,
        pressContentType: data.pressContentType,
        activityDate: data.activityDate,
        location: data.location?.trim() ?? "",
        link: data.link?.trim() || "",
        imageUrl: primaryImage,
        videoUrl: primaryVideo,
        mediaItems: filledMedia,
        description: data.description || null,
        published: true,
        isCreative: false,
        planLabels,
        planLabel: planLabels[0] ?? null,
        sourceProductionType,
        sourceProductionId,
        sortOrder: rows.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setRows((prev) =>
        editingId
          ? prev.map((row) => (row.id === editingId ? { ...row, ...nextActivity } : row))
          : [...prev, nextActivity]
      );
      toast.success("ذخیره شد");
      closeDialog();
    });
  },
  (errors) => {
    reportInvalid(Object.keys(errors));
  }
  );

  return (
    <div className="space-y-6">
      {tutorialModal}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">مجله و روزنامه</h1>
          <p className="text-sm text-muted-foreground">ثبت آگهی‌های مجله و روزنامه با چند رسانه</p>
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
        items={rows}
      />

      <SectionBulkEditBar
        campaignId={campaignId}
        contentType="press"
        bulkMode={bulk.bulkMode}
        onBulkModeChange={bulk.setBulkMode}
        selectedIds={[...bulk.selectedIds]}
        visibleCount={visibleRows.length}
        allVisibleSelected={bulk.allVisibleSelected}
        onToggleAllVisible={bulk.toggleAllVisible}
        onClearSelection={bulk.clearSelection}
        contentPlans={contentPlans}
        contentTopics={contentTopics}
        isFullAdmin={isFullAdmin}
        users={users}
      />

      {filteredRows.length === 0 && rows.length === 0 ? (
        <AdminEmptyCreateState message="هنوز موردی ثبت نشده است.">
          {!bulk.bulkMode ? (
            <AdminCompactAddCard onClick={openCreate} label="ثبت جدید" />
          ) : null}
        </AdminEmptyCreateState>
      ) : viewMode === "grid" ? (
        <div className={ADMIN_CONTENT_GRID_CLASS}>
          {!bulk.bulkMode && <AdminCompactAddCard onClick={openCreate} label="ثبت جدید" />}
          {visibleRows.map((activity) => (
            <BulkItemShell
              key={activity.id}
              enabled={bulk.bulkMode}
              selected={bulk.isSelected(activity.id)}
              onToggle={() => bulk.toggle(activity.id)}
            >
              <AdminActivityCompactCard
                activity={activity}
                onClick={() => openEdit(activity)}
                onView={() => setPreviewActivity(activity)}
                onEdit={() => openEdit(activity)}
                onDelete={() => handleDelete(activity)}
              />
            </BulkItemShell>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {!bulk.bulkMode && (
            <div className="max-w-[10rem]">
              <AdminCompactAddCard onClick={openCreate} label="ثبت جدید" />
            </div>
          )}
          <div className="overflow-hidden rounded-xl border">
            {visibleRows.map((activity) => (
              <div
                key={activity.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <div className="flex min-w-0 items-start gap-3">
                  {bulk.bulkMode && (
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={bulk.isSelected(activity.id)}
                      onChange={() => bulk.toggle(activity.id)}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {getActivityTypeLabel(activity.activityType)} · {activity.ownerName ?? "—"}
                    </p>
                  </div>
                </div>
                {!bulk.bulkMode && (
                  <AdminItemActions
                    onView={() => setPreviewActivity(activity)}
                    onEdit={() => openEdit(activity)}
                    onDelete={() => handleDelete(activity)}
                  />
                )}
              </div>
            ))}
            {filteredRows.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">موردی یافت نشد.</div>
            )}
          </div>
        </div>
      )}

      <AdminInfiniteScrollSentinel
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        remaining={filteredRows.length - visibleCount}
      />

      <AdminContentPreviewDialog
        open={Boolean(previewActivity)}
        onOpenChange={(nextOpen) => !nextOpen && setPreviewActivity(null)}
        title={previewActivity?.title ?? "نمایش انتشار مطبوعاتی"}
        description={previewActivity?.description}
        imageUrl={
          previewActivity?.imageUrl ||
          previewActivity?.mediaItems?.find((item) => item.url)?.url ||
          null
        }
        meta={
          previewActivity ? (
            <p className="text-xs text-muted-foreground">
              {getActivityTypeLabel(previewActivity.activityType)}
              {previewActivity.location ? ` · ${previewActivity.location}` : ""}
            </p>
          ) : null
        }
        details={
          previewActivity
            ? [
                { label: "تاریخ", value: formatPersianDate(previewActivity.activityDate) },
                {
                  label: "رسانه‌ها",
                  value: previewActivity.mediaItems?.length
                    ? `${previewActivity.mediaItems.length} مورد`
                    : "—",
                },
                {
                  label: "لینک",
                  value: previewActivity.link ? (
                    <a
                      href={previewActivity.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                      dir="ltr"
                    >
                      {previewActivity.link}
                    </a>
                  ) : (
                    "—"
                  ),
                },
                {
                  label: "برچسب‌ها",
                  value: previewActivity.planLabels?.length ? previewActivity.planLabels.join("، ") : "—",
                },
                { label: "مالک", value: previewActivity.ownerName ?? "—" },
                { label: "امتیاز", value: previewActivity.score ?? "—" },
              ]
            : []
        }
        onEdit={
          previewActivity
            ? () => {
                setPreviewActivity(null);
                openEdit(previewActivity);
              }
            : undefined
        }
        onDelete={previewActivity ? () => handleDelete(previewActivity) : undefined}
        deleteLabel="این انتشار"
        canSendMessage
        messageTarget={
          previewActivity
            ? {
                campaignId,
                contentType: "activity",
                contentId: previewActivity.id,
                contentTitle: previewActivity.title,
                ownerName: previewActivity.ownerName,
              }
            : null
        }
      />

      <AdminEditorDialog
        open={open}
        onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeDialog())}
        title={editingId ? "ویرایش" : "ثبت جدید"}
        description="ثبت یا ویرایش انتشار مطبوعاتی"
        size="lg"
        formProps={{ onSubmit }}
        footer={
          <AdminEditorDialogActions
            submit
            isPending={isPending}
            onDelete={editingId
              ? () => {
                  const current = rows.find((row) => row.id === editingId);
                  if (current) handleDelete(current);
                }
              : undefined}
            deleteLabel="حذف"
          />
        }
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
            <div data-field="title" className="space-y-2">
              <Label className={cn(highlightTitle && "text-destructive")}>عنوان</Label>
              <Input
                {...form.register("title")}
                maxLength={CONTENT_TITLE_MAX_LENGTH}
                className={cn(highlightTitle && "border-destructive focus-visible:ring-destructive")}
              />
              {highlightTitle && (
                <p className="text-xs text-destructive">عنوان پیش‌فرض یا خالی است؛ یک عنوان اختصاصی وارد کنید.</p>
              )}
            </div>
            <PlanLabelSelect
              topics={contentTopics}
              plans={contentPlans}
              values={planLabels}
              onChangeMultiple={setPlanLabels}
              invalid={highlightPlanLabels}
            />
            <div className="space-y-2">
              <Label>نوع</Label>
              <Select
                value={form.watch("activityType")}
                onValueChange={(value) => form.setValue("activityType", value as "magazine" | "newspaper")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {pressActivityTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getActivityTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>نوع محتوا</Label>
              <Select
                value={form.watch("pressContentType")}
                onValueChange={(value) =>
                  form.setValue("pressContentType", value as PressContentType)
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRESS_CONTENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getPressContentTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={cn("space-y-2", highlightDate && "rounded-lg border border-destructive bg-destructive/5 p-3")}>
              <PersianDateField control={form.control} name="activityDate" label="تاریخ" />
              {highlightDate && (
                <p className="mt-1 text-xs text-destructive">تاریخ انتشار خالی است؛ لطفاً انتخاب کنید.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className={cn(highlightMedia && "text-destructive")}>لینک مطلب (اختیاری)</Label>
              <div className="flex gap-2">
                <Input
                  {...form.register("link")}
                  dir="ltr"
                  placeholder="https://example.com/article"
                  className={cn(
                    "min-w-0 flex-1",
                    highlightMedia && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={handleFetchFromLink}
                  title="خواندن عنوان، توضیح و کاور از لینک"
                  className="shrink-0 gap-1.5"
                >
                  <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
                  از لینک
                </Button>
              </div>
              <p className={cn("text-xs text-muted-foreground", highlightMedia && "text-destructive")}>
                {highlightMedia
                  ? "برای نمایش عمومی، لینک مطلب یا تصویر کاور لازم است."
                  : "اگر لینک دارید، عنوان/توضیح/تصویر را می‌توان از صفحه خواند."}
              </p>
            </div>
            <div className="space-y-2">
              <Label>مکان (اختیاری)</Label>
              <Input {...form.register("location")} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>رسانه‌ها (حداکثر {MAX_MEDIA_ITEMS})</Label>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => addMediaItem("image")}>
                    + تصویر
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addMediaItem("video")}>
                    + ویدیو
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addMediaItem("audio")}>
                    + صوت
                  </Button>
                </div>
              </div>
              {mediaItems.map((item) => (
                <div key={item.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {item.type === "image" ? "تصویر" : item.type === "audio" ? "صوت" : "ویدیو"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setMediaItems((prev) => prev.filter((media) => media.id !== item.id))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <MediaUpload
                    value={item.url}
                    onChange={(url) =>
                      setMediaItems((prev) =>
                        prev.map((media) => (media.id === item.id ? { ...media, url } : media))
                      )
                    }
                    label={item.type === "image" ? "تصویر" : item.type === "audio" ? "صوت" : "ویدیو"}
                    kind={item.type === "image" ? "image" : item.type === "audio" ? "audio" : "video"}
                    uploadKind={
                      item.type === "image" ? "image" : item.type === "audio" ? "audio" : "activity-video"
                    }
                    fileOnly={item.type === "video" || item.type === "audio"}
                    maxFileSizeBytes={item.type === "video" ? ACTIVITY_VIDEO_MAX_BYTES : undefined}
                    coverImageUrl={
                      item.type === "video"
                        ? mediaItems.find((media) => media.type === "image" && media.url.trim())?.url
                        : undefined
                    }
                    onAutoCoverGenerated={
                      item.type === "video"
                        ? (coverUrl) => {
                            setMediaItems((prev) => {
                              const { mediaItems: next, applied } = applyVideoCoverToMediaItems(
                                prev,
                                coverUrl,
                                MAX_MEDIA_ITEMS
                              );
                              return applied ? next : prev;
                            });
                          }
                        : undefined
                    }
                    accept={
                      item.type === "image"
                        ? "image/*"
                        : item.type === "audio"
                          ? "audio/*"
                          : "video/mp4,video/webm,video/quicktime"
                    }
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label className={cn(highlightDescription && "text-amber-700 dark:text-amber-300")}>
                توضیحات (اختیاری)
              </Label>
              <Textarea
                {...form.register("description")}
                rows={4}
                className={cn(highlightDescription && "border-amber-500 focus-visible:ring-amber-500")}
              />
              {highlightDescription && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  توضیحات خالی است؛ بهتر است تکمیل شود.
                </p>
              )}
            </div>
      </AdminEditorDialog>
    </div>
  );
}
