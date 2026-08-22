"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  FileStack,
  HardDrive,
  ImageIcon,
  Newspaper,
  PackageCheck,
  Search,
  Send,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AdminPlanLabelsBadges } from "@/components/admin/admin-plan-labels-badges";
import { useAdminCampaign } from "@/components/admin/admin-campaign-provider";
import { ActivityFormDialog } from "@/components/admin/activity-form-dialog";
import { BillboardCreateAssignmentDialog } from "@/components/admin/billboard-create-assignment-dialog";
import { PressFormDialog } from "@/components/admin/press-form-dialog";
import { SitePublicationFormDialog } from "@/components/admin/site-publication-form-dialog";
import { SocialPostFormDialog } from "@/components/admin/social-post-form-dialog";
import {
  decodePlanLabel,
  formatPlanLabelDisplay,
} from "@/lib/content-topics";
import { getWorkspaceAssetCategoryMeta } from "@/lib/directive-workspace";
import {
  READY_DIRECTIVE_ASSET_CATEGORIES,
  READY_DIRECTIVE_ASSET_CATEGORY_LABELS,
  type PublishableProductionItem,
} from "@/lib/production-source-shared";
import type { DirectiveWorkspaceAssetCategory } from "@/lib/types";
import {
  adminHref,
  cn,
  formatPersianDateTime,
  formatPersianNumber,
} from "@/lib/utils";

const UNTOPICED_KEY = "__untopiced__";

type PublishDestination = "billboard" | "social" | "site" | "press" | "activity";

const PUBLISH_DESTINATION_OPTIONS: {
  value: PublishDestination;
  label: string;
  description: string;
}[] = [
  {
    value: "billboard",
    label: "تبلیغات محیطی",
    description: "بیلبورد و نمایش محیطی",
  },
  {
    value: "social",
    label: "شبکه اجتماعی",
    description: "پست در کانال‌های اجتماعی",
  },
  {
    value: "site",
    label: "سایت",
    description: "انتشار در سایت / پورتال",
  },
  {
    value: "press",
    label: "مجله و روزنامه",
    description: "نشر در مطبوعات",
  },
  {
    value: "activity",
    label: "اقدامات",
    description: "ثبت به‌عنوان اقدام میدانی",
  },
];

const CATEGORY_ICONS: Record<string, typeof ImageIcon> = {
  poster: ImageIcon,
  video: Video,
  banner: ImageIcon,
  ready_text: Newspaper,
  social: FileStack,
  print: HardDrive,
  action_file: FileStack,
};

function topicKeyForItem(item: PublishableProductionItem): string {
  const first = item.planLabels[0]?.trim();
  if (!first) return UNTOPICED_KEY;
  return decodePlanLabel(first).topic || UNTOPICED_KEY;
}

function topicLabelForKey(key: string): string {
  if (key === UNTOPICED_KEY) return "بدون موضوع";
  return key;
}

function itemAdminPath(campaignId: string, item: PublishableProductionItem): string {
  if (item.directiveId) {
    return adminHref(`/admin/directives/${item.directiveId}`, campaignId);
  }
  return adminHref("/admin/directives", campaignId);
}

function previewUrl(item: PublishableProductionItem): string | null {
  return item.coverImageUrl || item.mediaUrl || null;
}

function isImagePreview(url: string | null): boolean {
  if (!url) return false;
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(url) || url.includes("image");
}

function productionMediaUrl(item: PublishableProductionItem): string {
  return (item.coverImageUrl || item.mediaUrl || "").trim();
}

function readyCategoryLabel(category: string): string {
  if (category in READY_DIRECTIVE_ASSET_CATEGORY_LABELS) {
    return READY_DIRECTIVE_ASSET_CATEGORY_LABELS[
      category as keyof typeof READY_DIRECTIVE_ASSET_CATEGORY_LABELS
    ];
  }
  return getWorkspaceAssetCategoryMeta(category as DirectiveWorkspaceAssetCategory).label;
}

function categoryLabelForItem(item: PublishableProductionItem): string | null {
  if (!item.assetCategory) return null;
  return readyCategoryLabel(item.assetCategory);
}

function socialContentTypeForItem(
  item: PublishableProductionItem
): "video" | "text" | "image" {
  if (item.assetCategory === "video" || item.type === "video") return "video";
  if (item.assetCategory === "ready_text" || item.type === "text_content") return "text";
  return "image";
}

export function ReadyProductionsAdmin({
  campaignId,
  items,
}: {
  campaignId: string;
  items: PublishableProductionItem[];
}) {
  const router = useRouter();
  const { currentCampaign } = useAdminCampaign();
  const contentPlans = currentCampaign?.contentPlans ?? [];
  const contentTopics = currentCampaign?.contentTopics ?? [];

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [collapsedTopics, setCollapsedTopics] = useState<Set<string>>(new Set());

  const [destinationItem, setDestinationItem] =
    useState<PublishableProductionItem | null>(null);
  const [publishDestination, setPublishDestination] =
    useState<PublishDestination | null>(null);
  const [publishItem, setPublishItem] = useState<PublishableProductionItem | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== "all" && item.assetCategory !== categoryFilter) return false;
      if (!q) return true;
      const haystack = [
        item.title,
        item.subtitle ?? "",
        item.directiveTitle ?? "",
        ...item.planLabels.map(formatPlanLabelDisplay),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search, categoryFilter]);

  const topicGroups = useMemo(() => {
    const map = new Map<string, PublishableProductionItem[]>();
    for (const item of filtered) {
      const key = topicKeyForItem(item);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }

    const entries = [...map.entries()].map(([key, groupItems]) => ({
      key,
      label: topicLabelForKey(key),
      items: groupItems,
      count: groupItems.length,
    }));

    entries.sort((a, b) => {
      if (a.key === UNTOPICED_KEY) return 1;
      if (b.key === UNTOPICED_KEY) return -1;
      return a.label.localeCompare(b.label, "fa");
    });

    return entries;
  }, [filtered]);

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(
      READY_DIRECTIVE_ASSET_CATEGORIES.map((category) => [category, 0])
    ) as Record<string, number>;
    for (const item of items) {
      if (item.assetCategory && item.assetCategory in counts) {
        counts[item.assetCategory] += 1;
      }
    }
    return counts;
  }, [items]);

  const toggleTopic = (key: string) => {
    setCollapsedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openPublishDestinationPicker = (item: PublishableProductionItem) => {
    setPublishDestination(null);
    setPublishItem(null);
    setDestinationItem(item);
  };

  const selectPublishDestination = (destination: PublishDestination) => {
    if (!destinationItem) return;
    setPublishItem(destinationItem);
    setPublishDestination(destination);
    setDestinationItem(null);
  };

  const closePublishForm = () => {
    setPublishDestination(null);
    setPublishItem(null);
  };

  const handlePublishSaved = () => {
    closePublishForm();
    router.refresh();
  };

  const sourcePrefill = useMemo(
    () =>
      publishItem
        ? { type: publishItem.type, id: publishItem.id }
        : null,
    [publishItem]
  );
  const planLabelsPrefill = useMemo(
    () => publishItem?.planLabels ?? [],
    [publishItem]
  );
  const mediaPrefill = publishItem ? productionMediaUrl(publishItem) : "";
  const titlePrefill = publishItem?.title?.trim() || "";
  const bodyPrefill = publishItem?.body?.trim() || publishItem?.subtitle?.trim() || "";
  const formKey = publishItem
    ? `${publishDestination}:${publishItem.type}:${publishItem.id}`
    : null;

  const billboardInitialValues = useMemo(
    () =>
      publishItem
        ? {
            axis: titlePrefill,
            notes: bodyPrefill,
            periods: mediaPrefill
              ? [
                  {
                    startDate: new Date().toISOString().slice(0, 10),
                    endDate: new Date().toISOString().slice(0, 10),
                    existingBillboardImageUrl: mediaPrefill,
                  },
                ]
              : undefined,
          }
        : null,
    [publishItem, titlePrefill, bodyPrefill, mediaPrefill]
  );

  const socialInitialValues = useMemo(
    () =>
      publishItem
        ? {
            title: titlePrefill,
            coverImageUrl: mediaPrefill || undefined,
            mediaUrl: mediaPrefill || undefined,
            description: bodyPrefill || undefined,
            contentType: socialContentTypeForItem(publishItem),
          }
        : null,
    [publishItem, titlePrefill, bodyPrefill, mediaPrefill]
  );

  const siteInitialValues = useMemo(
    () =>
      publishItem
        ? {
            title: titlePrefill,
            coverImageUrl: mediaPrefill || undefined,
            description: bodyPrefill || undefined,
          }
        : null,
    [publishItem, titlePrefill, bodyPrefill, mediaPrefill]
  );

  const pressInitialValues = useMemo(
    () =>
      publishItem
        ? {
            title: titlePrefill,
            description: bodyPrefill || undefined,
            imageUrl: mediaPrefill || undefined,
          }
        : null,
    [publishItem, titlePrefill, bodyPrefill, mediaPrefill]
  );

  const activityInitialValues = useMemo(
    () =>
      publishItem
        ? {
            title: titlePrefill,
            description: bodyPrefill || undefined,
            imageUrl: mediaPrefill || undefined,
          }
        : null,
    [publishItem, titlePrefill, bodyPrefill, mediaPrefill]
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <PackageCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">تولیدات آماده</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          فقط دارایی‌های آمادهٔ دستورکارها، دسته‌بندی‌شده بر اساس موضوع محتوا
        </p>
        <p className="text-xs text-muted-foreground">
          {formatPersianNumber(filtered.length)} مورد
          {filtered.length !== items.length
            ? ` از ${formatPersianNumber(items.length)}`
            : ""}{" "}
          · {formatPersianNumber(topicGroups.length)} موضوع
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جستجو در عنوان، موضوع یا دستورکار…"
            className="pr-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs transition-colors",
            categoryFilter === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card hover:bg-accent"
          )}
        >
          همه ({formatPersianNumber(items.length)})
        </button>
        {READY_DIRECTIVE_ASSET_CATEGORIES.map((category) => {
          const count = categoryCounts[category] ?? 0;
          if (count === 0) return null;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs transition-colors",
                categoryFilter === category
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent"
              )}
            >
              {readyCategoryLabel(category)} ({formatPersianNumber(count)})
            </button>
          );
        })}
      </div>

      {topicGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          هنوز دارایی آماده‌ای از دستورکارها با این فیلترها ثبت نشده است.
        </div>
      ) : (
        <div className="space-y-4">
          {topicGroups.map((group) => {
            const collapsed = collapsedTopics.has(group.key);
            return (
              <section key={group.key} className="overflow-hidden rounded-xl border bg-card">
                <button
                  type="button"
                  onClick={() => toggleTopic(group.key)}
                  className="flex w-full items-center gap-3 border-b bg-muted/30 px-4 py-3 text-right transition-colors hover:bg-muted/50"
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      collapsed && "-rotate-90"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold">{group.label}</h2>
                  </div>
                  <Badge variant="secondary" className="shrink-0 tabular-nums">
                    {formatPersianNumber(group.count)}
                  </Badge>
                </button>

                {!collapsed && (
                  <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((item) => {
                      const Icon =
                        (item.assetCategory && CATEGORY_ICONS[item.assetCategory]) ||
                        ClipboardCheck;
                      const href = itemAdminPath(campaignId, item);
                      const thumb = previewUrl(item);
                      const showImage = isImagePreview(thumb);
                      const categoryLabel = categoryLabelForItem(item);

                      return (
                        <article
                          key={`${item.type}:${item.id}`}
                          className="flex flex-col overflow-hidden rounded-lg border bg-background"
                        >
                          <div className="relative aspect-[16/10] bg-muted">
                            {showImage && thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element -- remote/upload URLs vary by storage
                              <img
                                src={thumb}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-muted-foreground">
                                <Icon className="h-8 w-8 opacity-50" />
                                {item.body ? (
                                  <p className="line-clamp-3 text-xs leading-relaxed">
                                    {item.body}
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-1 flex-col gap-2 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="line-clamp-2 text-sm font-medium leading-snug">
                                {item.title || "بدون عنوان"}
                              </h3>
                              {categoryLabel ? (
                                <Badge variant="outline" className="shrink-0 text-[10px]">
                                  {categoryLabel}
                                </Badge>
                              ) : null}
                            </div>

                            {item.directiveTitle ? (
                              <p className="line-clamp-1 text-[11px] text-muted-foreground">
                                دستورکار: {item.directiveTitle}
                              </p>
                            ) : null}

                            <AdminPlanLabelsBadges
                              planLabels={item.planLabels}
                              maxVisible={3}
                            />

                            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                              <span className="text-[10px] text-muted-foreground">
                                {item.createdAt
                                  ? formatPersianDateTime(item.createdAt)
                                  : "—"}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="default"
                                  className="h-7 gap-1 px-2 text-xs"
                                  onClick={() => openPublishDestinationPicker(item)}
                                >
                                  <Send className="h-3 w-3" />
                                  نشر
                                </Button>
                                <Link
                                  href={href}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                >
                                  مشاهده
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(destinationItem)}
        onOpenChange={(open) => {
          if (!open) setDestinationItem(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>نشر تولید</DialogTitle>
            <DialogDescription>
              می‌خواهید به چه صورت نشر بدهید؟
              {destinationItem?.title ? (
                <span className="mt-1 block text-foreground/80">
                  «{destinationItem.title}»
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {PUBLISH_DESTINATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => selectPublishDestination(option.value)}
                className="rounded-lg border bg-card px-3 py-3 text-right transition-colors hover:border-primary hover:bg-accent"
              >
                <div className="text-sm font-medium">{option.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <BillboardCreateAssignmentDialog
        open={publishDestination === "billboard" && Boolean(publishItem)}
        onOpenChange={(open) => {
          if (!open) closePublishForm();
        }}
        campaignId={campaignId}
        contentPlans={contentPlans}
        contentTopics={contentTopics}
        mode="admin"
        initialValues={billboardInitialValues}
        initialValuesKey={formKey}
        initialSourceProduction={sourcePrefill}
        initialPlanLabels={planLabelsPrefill}
        onCreated={handlePublishSaved}
      />

      <SocialPostFormDialog
        open={publishDestination === "social" && Boolean(publishItem)}
        onOpenChange={(open) => {
          if (!open) closePublishForm();
        }}
        campaignId={campaignId}
        contentPlans={contentPlans}
        contentTopics={contentTopics}
        initialValues={socialInitialValues}
        initialValuesKey={formKey}
        initialSourceProduction={sourcePrefill}
        initialPlanLabels={planLabelsPrefill}
        onSaved={handlePublishSaved}
      />

      <SitePublicationFormDialog
        open={publishDestination === "site" && Boolean(publishItem)}
        onOpenChange={(open) => {
          if (!open) closePublishForm();
        }}
        campaignId={campaignId}
        contentPlans={contentPlans}
        contentTopics={contentTopics}
        initialValues={siteInitialValues}
        initialValuesKey={formKey}
        initialSourceProduction={sourcePrefill}
        initialPlanLabels={planLabelsPrefill}
        onSaved={handlePublishSaved}
      />

      <PressFormDialog
        open={publishDestination === "press" && Boolean(publishItem)}
        onOpenChange={(open) => {
          if (!open) closePublishForm();
        }}
        campaignId={campaignId}
        contentPlans={contentPlans}
        contentTopics={contentTopics}
        initialValues={pressInitialValues}
        initialValuesKey={formKey}
        initialSourceProduction={sourcePrefill}
        initialPlanLabels={planLabelsPrefill}
        onSaved={handlePublishSaved}
      />

      <ActivityFormDialog
        open={publishDestination === "activity" && Boolean(publishItem)}
        onOpenChange={(open) => {
          if (!open) closePublishForm();
        }}
        campaignId={campaignId}
        contentPlans={contentPlans}
        contentTopics={contentTopics}
        initialValues={activityInitialValues}
        initialValuesKey={formKey}
        initialSourceProduction={sourcePrefill}
        initialPlanLabels={planLabelsPrefill}
        onSaved={handlePublishSaved}
      />
    </div>
  );
}
