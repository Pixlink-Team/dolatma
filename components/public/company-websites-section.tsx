"use client";

import { useMemo } from "react";
import { ExternalLink, Globe } from "lucide-react";
import type { CompanyWebsite, DataOwnerGroup } from "@/lib/types";
import { CollapsibleSection } from "@/components/public/collapsible-section";
import { OwnerGroupedSection } from "@/components/public/owner-grouped-section";
import { SectionTopCompaniesBox } from "@/components/public/section-top-companies-box";
import { useFilteredOwnerGroups } from "@/lib/hooks/use-filtered-owner-groups";
import { useCampaignSectionVisibility } from "@/lib/hooks/use-campaign-section-visibility";
import { flattenOwnerGroupsInSortOrder, shouldRenderChronologically } from "@/lib/owner-groups";
import { useOwnerLocationFilter } from "@/lib/context/owner-location-filter-context";
import { ShowMoreButton } from "@/components/public/show-more-button";
import { useSectionPagination } from "@/lib/hooks/use-section-pagination";
import { Button } from "@/components/ui/button";
import { ImageZoom } from "@/components/ui/image-zoom";
import { PublicContentCard } from "@/components/public/public-content-card";

const ITEMS_PER_ROW = 1;

interface CompanyWebsitesSectionProps {
  websites: CompanyWebsite[];
  groups: DataOwnerGroup<CompanyWebsite>[];
}

function WebsiteCard({ item }: { item: CompanyWebsite }) {
  const media = item.logoUrl ? (
    <ImageZoom
      src={item.logoUrl}
      alt={item.title}
      className="h-full w-full"
      imgClassName="object-cover"
      sizes="(max-width: 640px) 100vw, 280px"
      quality={60}
    />
  ) : (
    <div className="flex h-full items-center justify-center bg-muted">
      <Globe className="h-12 w-12 text-muted-foreground" />
    </div>
  );

  return (
    <PublicContentCard
      title={item.title}
      category={item.companyName || "سایت شرکت"}
      ownerUserId={item.ownerUserId}
      ownerName={item.ownerName}
      media={media}
      actions={
        <Button variant="outline" size="sm" asChild>
          <a href={item.url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            باز کردن سایت
          </a>
        </Button>
      }
    />
  );
}

function WebsiteList({ items }: { items: CompanyWebsite[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <WebsiteCard key={item.id} item={item} />
      ))}
    </div>
  );
}

export function CompanyWebsitesSection({ websites, groups }: CompanyWebsitesSectionProps) {
  const { filter } = useOwnerLocationFilter();
  const locationFilteredGroups = useFilteredOwnerGroups(groups, (item) => item.createdAt);
  const filteredWebsites = useMemo(
    () => flattenOwnerGroupsInSortOrder(locationFilteredGroups, filter.sortOrder),
    [locationFilteredGroups, filter.sortOrder]
  );
  const sectionVisible = useCampaignSectionVisibility(websites.length, filteredWebsites.length);

  const { effectiveCount, hasMore, loadMore } = useSectionPagination(
    filteredWebsites.length,
    ITEMS_PER_ROW,
    3,
    `company-websites:${filteredWebsites.length}`
  );

  const chronological = shouldRenderChronologically(filter.sortOrder);
  const visibleItems = useMemo(
    () => filteredWebsites.slice(0, effectiveCount),
    [filteredWebsites, effectiveCount]
  );
  const visibleGroups = useMemo(() => {
    const ids = new Set(visibleItems.map((item) => item.id));
    return locationFilteredGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => ids.has(item.id)),
      }))
      .filter((group) => group.items.length > 0);
  }, [locationFilteredGroups, visibleItems]);

  if (!sectionVisible) return null;

  return (
    <CollapsibleSection
      id="company-websites"
      title="سایت‌های شرکت‌ها"
      description="معرفی سایت‌هایی که شرکت‌ها در اقدام دارند"
    >
      <SectionTopCompaniesBox groups={locationFilteredGroups} />
      {filteredWebsites.length === 0 ? (
        <div className="rounded-xl border bg-card py-12 text-center text-muted-foreground">
          سایتی با فیلتر انتخاب‌شده یافت نشد.
        </div>
      ) : (
        <div className="space-y-4">
          <OwnerGroupedSection
            groups={visibleGroups}
            flatItems={chronological ? visibleItems : null}
          >
            {(groupItems) => <WebsiteList items={groupItems} />}
          </OwnerGroupedSection>

          {hasMore && (
            <ShowMoreButton
              remaining={filteredWebsites.length - effectiveCount}
              onClick={loadMore}
            />
          )}
        </div>
      )}
    </CollapsibleSection>
  );
}
