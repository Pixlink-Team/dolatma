"use client";

import { useMemo } from "react";
import { ExternalLink, Globe } from "lucide-react";
import type { DataOwnerGroup, SocialMediaPost } from "@/lib/types";
import { formatPersianDate } from "@/lib/utils";
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
import {
  filterGroupsByDisplayContent,
  PUBLIC_MEDIA_GRID_CLASS,
  socialPostHasDisplayContent,
} from "@/lib/public-media-section";
import { ContentScoreControl } from "@/components/admin/content-score-control";
import { useContentScoreAccess } from "@/lib/context/content-score-context";

const PUBLICATIONS_ITEMS_PER_ROW = 1;

interface SitePublicationsSectionProps {
  publications: SocialMediaPost[];
  groups: DataOwnerGroup<SocialMediaPost>[];
}

function PublicationList({ items }: { items: SocialMediaPost[] }) {
  const { canScore, campaignId } = useContentScoreAccess();

  return (
    <div className={PUBLIC_MEDIA_GRID_CLASS}>
      {items.map((item) => (
        <PublicContentCard
          key={item.id}
          title={item.title}
          date={formatPersianDate(item.publishedDate)}
          category="انتشار در سایت"
          topics={item.planLabels ?? (item.planLabel ? [item.planLabel] : [])}
          ownerUserId={item.ownerUserId}
          ownerName={item.ownerName}
          description={item.description}
          media={
            item.coverImageUrl ? (
              <ImageZoom
                src={item.coverImageUrl}
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
            )
          }
          score={
            canScore || item.score != null ? (
              <ContentScoreControl
                campaignId={campaignId || item.campaignId}
                contentType="site_publication"
                contentId={item.id}
                score={item.score}
                canScore={canScore}
                compact
              />
            ) : null
          }
          actions={
            item.link ? (
              <Button variant="outline" size="sm" asChild>
                <a href={item.link} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  مشاهده
                </a>
              </Button>
            ) : undefined
          }
        />
      ))}
    </div>
  );
}

export function SitePublicationsSection({ publications, groups }: SitePublicationsSectionProps) {
  const { filter } = useOwnerLocationFilter();
  const locationFilteredGroups = useFilteredOwnerGroups(groups, (item) => item.publishedDate);
  const filteredGroups = useMemo(
    () => filterGroupsByDisplayContent(locationFilteredGroups, socialPostHasDisplayContent),
    [locationFilteredGroups]
  );
  const filteredPublications = useMemo(
    () => flattenOwnerGroupsInSortOrder(filteredGroups, filter.sortOrder),
    [filteredGroups, filter.sortOrder]
  );
  const sectionVisible = useCampaignSectionVisibility(publications.length, filteredPublications.length);

  const { effectiveCount, hasMore, loadMore } = useSectionPagination(
    filteredPublications.length,
    PUBLICATIONS_ITEMS_PER_ROW,
    3,
    `site-publications:${filteredPublications.length}`
  );

  const chronological = shouldRenderChronologically(filter.sortOrder);
  const visibleItems = useMemo(
    () => filteredPublications.slice(0, effectiveCount),
    [filteredPublications, effectiveCount]
  );
  const visibleGroups = useMemo(() => {
    const ids = new Set(visibleItems.map((item) => item.id));
    return filteredGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => ids.has(item.id)),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredGroups, visibleItems]);

  if (!sectionVisible) return null;

  return (
    <CollapsibleSection
      id="site-publications"
      title="انتشار در سایت"
      description="مطالب منتشرشده در سایت کمپین — عنوان هر مورد لینک مستقیم به صفحه است"
    >
      <SectionTopCompaniesBox groups={filteredGroups} />
      {filteredPublications.length === 0 ? (
        <div className="rounded-xl border bg-card py-12 text-center text-muted-foreground">
          مطلبی با فیلتر انتخاب‌شده یافت نشد.
        </div>
      ) : (
        <div className="space-y-4">
          <OwnerGroupedSection
            groups={visibleGroups}
            flatItems={chronological ? visibleItems : null}
          >
            {(groupItems) => <PublicationList items={groupItems} />}
          </OwnerGroupedSection>

          {hasMore && (
            <ShowMoreButton
              remaining={filteredPublications.length - effectiveCount}
              onClick={loadMore}
            />
          )}
        </div>
      )}
    </CollapsibleSection>
  );
}
