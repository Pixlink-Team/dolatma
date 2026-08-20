"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AdminContentFilterBar,
  collectAdminFilterUsers,
  DEFAULT_ADMIN_CONTENT_FILTER,
  matchesAdminContentFilter,
  type AdminContentFilterState,
} from "@/components/admin/admin-content-filter-bar";
import {
  AdminBillboardAddCard,
  AdminBillboardCompactCard,
} from "@/components/admin/admin-billboard-compact-card";
import {
  ADMIN_CONTENT_GRID_CLASS,
  AdminEmptyCreateState,
} from "@/components/admin/admin-compact-add-card";
import { BillboardCreateAssignmentDialog } from "@/components/admin/billboard-create-assignment-dialog";
import { AdminViewModeToggle } from "@/components/admin/admin-view-mode-toggle";
import { AdminItemActions } from "@/components/admin/admin-item-actions";
import { AdminPlanLabelsBadges } from "@/components/admin/admin-plan-labels-badges";
import { AdminContentPreviewDialog } from "@/components/admin/admin-content-preview-dialog";
import {
  BulkItemShell,
  SectionBulkEditBar,
  useSectionBulkEdit,
} from "@/components/admin/section-bulk-edit";
import { deleteBillboardAction } from "@/lib/actions/admin-actions";
import { BillboardCategoryChart } from "@/components/charts/billboard-category-chart";
import {
  buildBillboardCategoryStats,
  resolveBillboardCategoryLabel,
} from "@/lib/billboard-categories";
import { getBillboardDisplayImage } from "@/lib/billboard-media";
import type { ContentTopic } from "@/lib/content-topics";
import { type EditSuggestionMissingField } from "@/lib/edit-suggestions";
import { useAdminEditDeepLink } from "@/lib/hooks/use-admin-edit-deep-link";
import { useAdminViewMode } from "@/lib/hooks/use-admin-view-mode";
import { useSectionCreateGate } from "@/lib/hooks/use-section-create-gate";
import { useAdminInfiniteScroll } from "@/lib/hooks/use-admin-infinite-scroll";
import { AdminInfiniteScrollSentinel } from "@/components/admin/admin-infinite-scroll-sentinel";
import type { AdminUser, Billboard } from "@/lib/types";
import { formatPersianDate, getStatusLabel } from "@/lib/utils";
import { formatBillboardCityLine } from "@/lib/billboard-location";

interface ContributorProfile {
  province?: string | null;
  city?: string | null;
  email: string;
  name: string;
}

interface BillboardsAdminProps {
  campaignId: string;
  initialBillboards: Billboard[];
  contentPlans?: string[];
  contentTopics?: ContentTopic[];
  canScore?: boolean;
  isFullAdmin?: boolean;
  users?: AdminUser[];
  contributorProfile?: ContributorProfile | null;
}

export function BillboardsAdmin({
  campaignId,
  initialBillboards,
  contentPlans = [],
  contentTopics = [],
  canScore = false,
  isFullAdmin = false,
  users = [],
  contributorProfile = null,
}: BillboardsAdminProps) {
  const { requestCreate, tutorialModal } = useSectionCreateGate("billboards", campaignId);
  const router = useRouter();
  const [billboards, setBillboards] = useState(initialBillboards);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBillboard, setEditingBillboard] = useState<Billboard | null>(null);
  const [previewBillboard, setPreviewBillboard] = useState<Billboard | null>(null);
  const [contentFilter, setContentFilter] = useState<AdminContentFilterState>(DEFAULT_ADMIN_CONTENT_FILTER);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { viewMode, setViewMode } = useAdminViewMode("billboards");
  const [isLocalizingImages, setIsLocalizingImages] = useState(false);
  const [, startTransition] = useTransition();

  const { highlightFields, setHighlightFields, resetDeepLink } = useAdminEditDeepLink({
    items: billboards,
    getId: (billboard) => billboard.id,
    basePath: "/admin/billboards",
    onOpen: (billboard, fields) => {
      setEditingBillboard(billboard);
      setHighlightFields(fields);
      setFormOpen(true);
    },
  });

  useEffect(() => {
    setBillboards(initialBillboards);
  }, [initialBillboards]);

  const filterUsers = useMemo(() => collectAdminFilterUsers(billboards), [billboards]);
  const contentFiltered = useMemo(
    () => billboards.filter((item) => matchesAdminContentFilter(item, contentFilter)),
    [billboards, contentFilter]
  );
  const categoryStats = useMemo(
    () => buildBillboardCategoryStats(contentFiltered),
    [contentFiltered]
  );
  const filteredBillboards = useMemo(() => {
    if (categoryFilter === "all") return contentFiltered;
    return contentFiltered.filter(
      (item) => resolveBillboardCategoryLabel(item) === categoryFilter
    );
  }, [contentFiltered, categoryFilter]);

  const paginationResetKey = `${contentFilter.userKey}:${contentFilter.planLabels.join(",")}:${categoryFilter}:${viewMode}`;
  const { visibleCount, hasMore, isLoadingMore, loadMore } = useAdminInfiniteScroll(
    filteredBillboards.length,
    paginationResetKey
  );
  const visibleBillboards = useMemo(
    () => filteredBillboards.slice(0, visibleCount),
    [filteredBillboards, visibleCount]
  );
  const visibleIds = useMemo(
    () => visibleBillboards.map((item) => item.id),
    [visibleBillboards]
  );
  const bulk = useSectionBulkEdit(visibleIds);

  const openCreate = () => {
    void requestCreate(() => {
      setEditingBillboard(null);
      setHighlightFields([]);
      setFormOpen(true);
    });
  };

  const openEdit = (billboard: Billboard, fields: EditSuggestionMissingField[] = []) => {
    setEditingBillboard(billboard);
    setHighlightFields(fields);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingBillboard(null);
    resetDeepLink();
  };

  const handleDelete = (item: Billboard) => {
    startTransition(async () => {
      await deleteBillboardAction(item.id);
      setBillboards((prev) => prev.filter((billboard) => billboard.id !== item.id));
      toast.success("حذف شد");
      router.refresh();
    });
  };

  const handleRemoveExternalDeps = () => {
    if (isLocalizingImages) return;
    const confirmed = window.confirm(
      "همه وابستگی‌های خارجی حذف شوند؟\n\n" +
        "• تصاویر خارجی دانلود و محلی می‌شوند\n" +
        "• تگ‌های map/assignment/provider پاک می‌شوند\n" +
        "• منبع (source) همه بیلبوردها به «دستی» تغییر می‌کند\n" +
        "• شناسه‌های خارجی حذف می‌شوند"
    );
    if (!confirmed) return;

    setIsLocalizingImages(true);
    startTransition(async () => {
      try {
        const res = await fetch("/api/billboard/remove-external-deps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId }),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          toast.error(result.error ?? "عملیات ناموفق بود");
          return;
        }
        const {
          imagesLocalized,
          tagsCleanedCount,
          sourceFixedCount,
          externalIdClearedCount,
          periodsFixed,
          alreadyClean,
        } = result;
        const changes =
          imagesLocalized +
          tagsCleanedCount +
          sourceFixedCount +
          externalIdClearedCount +
          periodsFixed;
        if (changes === 0) {
          toast.message("همه بیلبوردها قبلاً مستقل هستند — وابستگی خارجی وجود ندارد.");
        } else {
          const parts: string[] = [];
          if (imagesLocalized > 0) parts.push(`${imagesLocalized} تصویر محلی شد`);
          if (tagsCleanedCount > 0) parts.push(`${tagsCleanedCount} تگ خارجی پاک شد`);
          if (sourceFixedCount > 0) parts.push(`${sourceFixedCount} منبع اصلاح شد`);
          if (externalIdClearedCount > 0)
            parts.push(`${externalIdClearedCount} شناسه خارجی حذف شد`);
          if (periodsFixed > 0) parts.push(`${periodsFixed} دوره نمایش اصلاح شد`);
          toast.success(
            parts.join(" | ") + (alreadyClean > 0 ? ` — ${alreadyClean} بدون تغییر` : "")
          );
        }
        router.refresh();
      } catch {
        toast.error("خطا در حذف وابستگی‌ها");
      } finally {
        setIsLocalizingImages(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      {tutorialModal}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">تبلیغات محیطی</h1>
          <p className="text-sm text-muted-foreground">
            بیلبورد، استرابورد، عرشه پل، تلویزیون شهری و سایر رسانه‌های محیطی
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isFullAdmin && (
            <Button
              type="button"
              variant="outline"
              disabled={isLocalizingImages}
              onClick={handleRemoveExternalDeps}
            >
              {isLocalizingImages ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال پاکسازی...
                </>
              ) : (
                "حذف وابستگی خارجی"
              )}
            </Button>
          )}
          <AdminViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <AdminContentFilterBar
        filter={contentFilter}
        onChange={setContentFilter}
        users={isFullAdmin ? filterUsers : []}
        plans={contentPlans}
        items={billboards}
      />

      {categoryStats.length > 0 && (
        <div className="mb-4">
          <BillboardCategoryChart
            data={categoryStats}
            selectedLabel={categoryFilter === "all" ? null : categoryFilter}
            onSelect={(label) =>
              setCategoryFilter((prev) => (prev === label ? "all" : label))
            }
          />
        </div>
      )}

      <SectionBulkEditBar
        campaignId={campaignId}
        contentType="billboard"
        bulkMode={bulk.bulkMode}
        onBulkModeChange={bulk.setBulkMode}
        selectedIds={[...bulk.selectedIds]}
        visibleCount={visibleBillboards.length}
        allVisibleSelected={bulk.allVisibleSelected}
        onToggleAllVisible={bulk.toggleAllVisible}
        onClearSelection={bulk.clearSelection}
        contentPlans={contentPlans}
        contentTopics={contentTopics}
        isFullAdmin={isFullAdmin}
        users={users}
      />

      <BillboardCreateAssignmentDialog
        open={formOpen}
        onOpenChange={(open) => (open ? setFormOpen(true) : closeForm())}
        campaignId={campaignId}
        contentPlans={contentPlans}
        contentTopics={contentTopics}
        canScore={canScore}
        mode={isFullAdmin ? "admin" : "client"}
        contributorProfile={contributorProfile}
        editingBillboard={editingBillboard}
        highlightFields={highlightFields}
        onCreated={() => router.refresh()}
      />

      {filteredBillboards.length === 0 ? (
        <AdminEmptyCreateState message="هنوز تبلیغات محیطی ثبت نشده است.">
          {!bulk.bulkMode ? <AdminBillboardAddCard onClick={openCreate} /> : null}
        </AdminEmptyCreateState>
      ) : viewMode === "grid" ? (
        <div className={ADMIN_CONTENT_GRID_CLASS}>
          {!bulk.bulkMode && <AdminBillboardAddCard onClick={openCreate} />}
          {visibleBillboards.map((billboard) => (
            <BulkItemShell
              key={billboard.id}
              enabled={bulk.bulkMode}
              selected={bulk.isSelected(billboard.id)}
              onToggle={() => bulk.toggle(billboard.id)}
            >
              <AdminBillboardCompactCard
                billboard={billboard}
                onClick={() => openEdit(billboard)}
                onView={() => setPreviewBillboard(billboard)}
                onEdit={() => openEdit(billboard)}
                onDelete={handleDelete}
                canScore={canScore}
                onScoreSaved={(item, score) => {
                  setBillboards((prev) =>
                    prev.map((row) => (row.id === item.id ? { ...row, score } : row))
                  );
                }}
              />
            </BulkItemShell>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {!bulk.bulkMode && (
            <div className="max-w-[10rem]">
              <AdminBillboardAddCard onClick={openCreate} />
            </div>
          )}
          <div className="overflow-hidden rounded-xl border">
          {visibleBillboards.map((billboard) => (
            <div
              key={billboard.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <div className="flex min-w-0 items-start gap-3">
                {bulk.bulkMode && (
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={bulk.isSelected(billboard.id)}
                    onChange={() => bulk.toggle(billboard.id)}
                  />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{billboard.title}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {resolveBillboardCategoryLabel(billboard)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatBillboardCityLine(billboard)}</p>
                  <AdminPlanLabelsBadges
                    planLabels={billboard.planLabels}
                    planLabel={billboard.planLabel}
                    className="mt-1"
                  />
                </div>
              </div>
              {!bulk.bulkMode && (
                <AdminItemActions
                  onView={() => setPreviewBillboard(billboard)}
                  onEdit={() => openEdit(billboard)}
                  onDelete={() => handleDelete(billboard)}
                />
              )}
            </div>
          ))}
          </div>
        </div>
      )}

      <AdminInfiniteScrollSentinel
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        remaining={filteredBillboards.length - visibleCount}
      />

      <AdminContentPreviewDialog
        open={Boolean(previewBillboard)}
        onOpenChange={(open) => !open && setPreviewBillboard(null)}
        title={previewBillboard?.title ?? "نمایش تبلیغات محیطی"}
        description={previewBillboard?.description}
        imageUrl={previewBillboard ? getBillboardDisplayImage(previewBillboard) : null}
        meta={
          previewBillboard ? (
            <div className="space-y-1">
              <Badge variant="outline" className="text-[10px]">
                {resolveBillboardCategoryLabel(previewBillboard)}
              </Badge>
              <p className="text-xs text-muted-foreground">{formatBillboardCityLine(previewBillboard)}</p>
            </div>
          ) : null
        }
        details={
          previewBillboard
            ? [
                { label: "تاریخ", value: formatPersianDate(previewBillboard.date) },
                { label: "وضعیت", value: getStatusLabel(previewBillboard.status) },
                { label: "کد", value: previewBillboard.code || "—" },
                { label: "مالک", value: previewBillboard.ownerName ?? "—" },
                {
                  label: "برچسب‌ها",
                  value: previewBillboard.planLabels?.length ? previewBillboard.planLabels.join("، ") : "—",
                },
                { label: "یادداشت", value: previewBillboard.notes || "—" },
              ]
            : []
        }
        onEdit={
          previewBillboard
            ? () => {
                setPreviewBillboard(null);
                openEdit(previewBillboard);
              }
            : undefined
        }
        canSendMessage
        messageTarget={
          previewBillboard
            ? {
                campaignId,
                contentType: "billboard",
                contentId: previewBillboard.id,
                contentTitle: previewBillboard.title,
                ownerName: previewBillboard.ownerName,
              }
            : null
        }
      />
    </div>
  );
}
