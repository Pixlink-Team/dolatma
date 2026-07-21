"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Download, ExternalLink, Eye, Music, Play, Star } from "lucide-react";
import { getActivityTypeLabel } from "@/lib/activity-types";
import { useFilteredOwnerGroups } from "@/lib/hooks/use-filtered-owner-groups";
import { useCampaignSectionVisibility } from "@/lib/hooks/use-campaign-section-visibility";
import { flattenOwnerGroupsInSortOrder, shouldRenderChronologically } from "@/lib/owner-groups";
import { useOwnerLocationFilter } from "@/lib/context/owner-location-filter-context";
import { ShowMoreButton } from "@/components/public/show-more-button";
import { usePublicMediaPagination } from "@/lib/hooks/use-public-media-pagination";
import type { CampaignActivity, DataOwnerGroup } from "@/lib/types";
import { formatPersianDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/public/collapsible-section";
import { OwnerGroupedSection } from "@/components/public/owner-grouped-section";
import { SectionTopCompaniesBox } from "@/components/public/section-top-companies-box";
import { ActivityMediaDialog } from "@/components/public/activity-media-dialog";
import { PublicContentCard } from "@/components/public/public-content-card";
import { ContentScoreControl } from "@/components/admin/content-score-control";
import { useContentScoreAccess } from "@/lib/context/content-score-context";
import {
  activityHasDisplayContent,
  filterGroupsByDisplayContent,
  PUBLIC_MEDIA_GRID_CLASS,
} from "@/lib/public-media-section";
import { VideoThumbnail } from "@/components/media/video-thumbnail";
import { cn } from "@/lib/utils";
import { CARD_THUMB_WIDTH, toCardThumbnailUrl } from "@/lib/card-thumbnail-url";
import { downloadMedia, getFilenameFromUrl } from "@/lib/media-utils";

type CreativePublicFilter = "all" | "creative";

interface ActivitiesSectionProps {
  activities: CampaignActivity[];
  groups: DataOwnerGroup<CampaignActivity>[];
  sectionId?: string;
  title?: string;
  description?: string;
  hasDisplayContent?: (activity: CampaignActivity) => boolean;
}

function hasActivityMedia(activity: CampaignActivity): boolean {
  if (activity.mediaItems?.some((item) => item.url.trim())) return true;
  return Boolean(activity.imageUrl?.trim() || activity.videoUrl?.trim());
}

function ActivityCard({
  activity,
  onOpen,
}: {
  activity: CampaignActivity;
  onOpen: () => void;
}) {
  const { canScore, campaignId } = useContentScoreAccess();
  const hasMedia = hasActivityMedia(activity);
  const hasLink = Boolean(activity.link?.trim());
  const hasVideo = Boolean(activity.videoUrl?.trim());
  const audioOnly =
    !hasVideo &&
    !activity.imageUrl?.trim() &&
    Boolean(activity.mediaItems?.some((item) => item.type === "audio" && item.url.trim()));
  const primaryMediaUrl =
    activity.imageUrl?.trim() ||
    activity.videoUrl?.trim() ||
    activity.mediaItems?.find((item) => item.url.trim())?.url;

  const handleDownload = () => {
    if (!primaryMediaUrl) return;
    void downloadMedia(primaryMediaUrl, getFilenameFromUrl(primaryMediaUrl, activity.title));
  };

  return (
    <PublicContentCard
      title={activity.title}
      date={formatPersianDate(activity.activityDate)}
      category={getActivityTypeLabel(activity.activityType)}
      topics={activity.planLabels ?? (activity.planLabel ? [activity.planLabel] : [])}
      ownerUserId={activity.ownerUserId}
      ownerName={activity.ownerName}
      media={
        <div className={cn("group relative h-full w-full", hasMedia && "cursor-pointer")}>
        {hasVideo ? (
          <VideoThumbnail
            videoUrl={activity.videoUrl!}
            alt={activity.title}
            className="object-cover apple-media-zoom"
          />
        ) : activity.imageUrl ? (
          <Image
            src={toCardThumbnailUrl(activity.imageUrl, { width: CARD_THUMB_WIDTH })}
            alt={activity.title}
            fill
            unoptimized
            className="object-cover apple-media-zoom"
            sizes="(max-width: 1280px) 16vw, 200px"
          />
        ) : audioOnly ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-muted-foreground">
            <Music className="h-8 w-8" />
            <span className="text-xs">فایل صوتی</span>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
            {getActivityTypeLabel(activity.activityType)}
          </div>
        )}

        {(hasVideo || audioOnly) && hasMedia && (
          <div className="apple-overlay pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100">
            {hasVideo ? (
              <Play className="h-10 w-10 text-white drop-shadow" />
            ) : (
              <Music className="h-10 w-10 text-white drop-shadow" />
            )}
          </div>
        )}

        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          <Badge variant="overlay" className="text-[10px] px-1.5 py-0">
            {getActivityTypeLabel(activity.activityType)}
          </Badge>
          {activity.isCreative && (
            <Badge
              variant="overlay"
              className="gap-0.5 bg-amber-500/90 text-[10px] px-1.5 py-0 text-white"
            >
              <Star className="h-2.5 w-2.5 fill-white" />
              خلاقانه
            </Badge>
          )}
        </div>
        </div>
      }
      score={
        canScore || activity.score != null ? (
          <ContentScoreControl
            campaignId={campaignId || activity.campaignId}
            contentType="activity"
            contentId={activity.id}
            score={activity.score}
            canScore={canScore}
            compact
          />
        ) : null
      }
      actions={
        hasMedia || hasLink ? (
          <>
            {hasMedia && (
              <Button variant="outline" size="sm" onClick={onOpen}>
                <Eye className="h-4 w-4" />
                مشاهده
              </Button>
            )}
            {primaryMediaUrl && (
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                دانلود
              </Button>
            )}
            {hasLink && (
              <Button variant="outline" size="sm" asChild>
                <a href={activity.link!} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  لینک
                </a>
              </Button>
            )}
          </>
        ) : undefined
      }
    />
  );
}

function ActivityCards({ activities }: { activities: CampaignActivity[] }) {
  const [selectedActivity, setSelectedActivity] = useState<CampaignActivity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openActivity = (activity: CampaignActivity) => {
    if (!hasActivityMedia(activity)) return;
    setSelectedActivity(activity);
    setDialogOpen(true);
  };

  return (
    <>
      <div className={PUBLIC_MEDIA_GRID_CLASS}>
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onOpen={() => openActivity(activity)}
          />
        ))}
      </div>

      <ActivityMediaDialog
        activity={selectedActivity}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}

export function ActivitiesSection({
  activities,
  groups,
  sectionId = "activities",
  title = "اقدامات",
  description = "فعالیت‌های میدانی و تبلیغاتی: تراکت، غرفه، برنامه فرهنگی و ...",
  hasDisplayContent = activityHasDisplayContent,
}: ActivitiesSectionProps) {
  const { filter } = useOwnerLocationFilter();
  const [creativeFilter, setCreativeFilter] = useState<CreativePublicFilter>("all");
  const locationFilteredGroups = useFilteredOwnerGroups(groups, (activity) => activity.activityDate);
  const creativeFilteredGroups = useMemo(() => {
    if (creativeFilter !== "creative") return locationFilteredGroups;
    return locationFilteredGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((activity) => activity.isCreative),
      }))
      .filter((group) => group.items.length > 0);
  }, [locationFilteredGroups, creativeFilter]);
  const filteredGroups = useMemo(
    () => filterGroupsByDisplayContent(creativeFilteredGroups, hasDisplayContent),
    [creativeFilteredGroups, hasDisplayContent]
  );
  const filteredActivities = useMemo(
    () => flattenOwnerGroupsInSortOrder(filteredGroups, filter.sortOrder),
    [filteredGroups, filter.sortOrder]
  );
  const hasAnyCreative = useMemo(
    () => activities.some((activity) => activity.isCreative),
    [activities]
  );
  const sectionVisible = useCampaignSectionVisibility(activities.length, filteredActivities.length);

  const { visibleCount, hasMore, loadMore } = usePublicMediaPagination(
    filteredActivities.length,
    `activities:${creativeFilter}:${filteredActivities.length}`
  );

  const chronological = shouldRenderChronologically(filter.sortOrder);
  const visibleItems = useMemo(
    () => filteredActivities.slice(0, visibleCount),
    [filteredActivities, visibleCount]
  );
  const visibleGroups = useMemo(() => {
    const visibleIds = new Set(visibleItems.map((activity) => activity.id));
    return filteredGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((activity) => visibleIds.has(activity.id)),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredGroups, visibleItems]);

  if (!sectionVisible) return null;

  return (
    <CollapsibleSection
      id={sectionId}
      title={title}
      description={description}
    >
      <SectionTopCompaniesBox groups={filteredGroups} />
      {hasAnyCreative && (
        <div className="mb-4 flex flex-wrap items-center gap-2" dir="rtl">
          <Button
            type="button"
            size="sm"
            variant={creativeFilter === "all" ? "default" : "outline"}
            onClick={() => setCreativeFilter("all")}
          >
            همه اقدامات
          </Button>
          <Button
            type="button"
            size="sm"
            variant={creativeFilter === "creative" ? "default" : "outline"}
            className="gap-1.5"
            onClick={() => setCreativeFilter("creative")}
          >
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            فقط خلاقانه
          </Button>
        </div>
      )}
      <>
          <OwnerGroupedSection
            groups={visibleGroups}
            flatItems={chronological ? visibleItems : null}
          >
            {(groupActivities) => <ActivityCards activities={groupActivities} />}
          </OwnerGroupedSection>

          {hasMore && (
            <div className="mt-4">
              <ShowMoreButton
                remaining={filteredActivities.length - visibleCount}
                onClick={loadMore}
              />
            </div>
          )}
        </>
    </CollapsibleSection>
  );
}
