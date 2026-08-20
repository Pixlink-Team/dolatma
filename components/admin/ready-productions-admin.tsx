"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AdminPlanLabelsBadges } from "@/components/admin/admin-plan-labels-badges";
import {
  decodePlanLabel,
  formatPlanLabelDisplay,
} from "@/lib/content-topics";
import { buildContentMessageAdminPath } from "@/lib/content-messages/types";
import { getWorkspaceAssetCategoryMeta } from "@/lib/directive-workspace";
import {
  PRODUCTION_SOURCE_TYPE_LABELS,
  PRODUCTION_SOURCE_TYPES,
  type ProductionSourceType,
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

const TYPE_ICONS: Record<ProductionSourceType, typeof ImageIcon> = {
  poster: ImageIcon,
  video: Video,
  file: FileStack,
  raw_media: HardDrive,
  text_content: Newspaper,
  directive_asset: ClipboardCheck,
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
  if (item.type === "directive_asset" && item.directiveId) {
    return adminHref(`/admin/directives/${item.directiveId}`, campaignId);
  }
  if (item.type === "directive_asset") {
    return adminHref("/admin/directives", campaignId);
  }
  return buildContentMessageAdminPath(item.type, campaignId, item.id);
}

function previewUrl(item: PublishableProductionItem): string | null {
  return item.coverImageUrl || item.mediaUrl || null;
}

function isImagePreview(url: string | null): boolean {
  if (!url) return false;
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(url) || url.includes("image");
}

export function ReadyProductionsAdmin({
  campaignId,
  items,
}: {
  campaignId: string;
  items: PublishableProductionItem[];
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ProductionSourceType | "all">("all");
  const [collapsedTopics, setCollapsedTopics] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
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
  }, [items, search, typeFilter]);

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

  const typeCounts = useMemo(() => {
    const counts = Object.fromEntries(
      PRODUCTION_SOURCE_TYPES.map((type) => [type, 0])
    ) as Record<ProductionSourceType, number>;
    for (const item of items) counts[item.type] += 1;
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

  return (
    <div className="space-y-6" dir="rtl">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <PackageCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">تولیدات آماده</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          تولیدات بخش تولید و دارایی‌های آمادهٔ دستورکارها، دسته‌بندی‌شده بر اساس موضوع محتوا
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
          onClick={() => setTypeFilter("all")}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs transition-colors",
            typeFilter === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card hover:bg-accent"
          )}
        >
          همه ({formatPersianNumber(items.length)})
        </button>
        {PRODUCTION_SOURCE_TYPES.map((type) => {
          const count = typeCounts[type];
          if (count === 0) return null;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs transition-colors",
                typeFilter === type
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent"
              )}
            >
              {PRODUCTION_SOURCE_TYPE_LABELS[type]} ({formatPersianNumber(count)})
            </button>
          );
        })}
      </div>

      {topicGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          هنوز تولید آماده‌ای با این فیلترها ثبت نشده است.
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
                      const Icon = TYPE_ICONS[item.type];
                      const href = itemAdminPath(campaignId, item);
                      const thumb = previewUrl(item);
                      const showImage = isImagePreview(thumb);
                      const categoryLabel =
                        item.type === "directive_asset" && item.assetCategory
                          ? getWorkspaceAssetCategoryMeta(
                              item.assetCategory as DirectiveWorkspaceAssetCategory
                            ).label
                          : null;

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
                              <Badge variant="outline" className="shrink-0 text-[10px]">
                                {PRODUCTION_SOURCE_TYPE_LABELS[item.type]}
                              </Badge>
                            </div>

                            {categoryLabel ? (
                              <p className="text-[11px] text-muted-foreground">{categoryLabel}</p>
                            ) : null}

                            {item.directiveTitle ? (
                              <p className="line-clamp-1 text-[11px] text-muted-foreground">
                                دستورکار: {item.directiveTitle}
                              </p>
                            ) : null}

                            {item.subtitle && item.type !== "directive_asset" ? (
                              <p className="line-clamp-2 text-xs text-muted-foreground">
                                {item.subtitle}
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
                              <Link
                                href={href}
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
                                مشاهده
                                <ExternalLink className="h-3 w-3" />
                              </Link>
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
    </div>
  );
}
