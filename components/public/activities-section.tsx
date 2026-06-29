"use client";

import { useMemo } from "react";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { isDirectVideoUrl } from "@/lib/media-utils";
import { getActivityTypeLabel } from "@/lib/activity-types";
import { useFilteredOwnerGroups } from "@/lib/hooks/use-filtered-owner-groups";
import { ShowMoreButton } from "@/components/public/show-more-button";
import { usePublicMediaPagination } from "@/lib/hooks/use-public-media-pagination";
import type { CampaignActivity, DataOwnerGroup } from "@/lib/types";
import { formatPersianDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/public/collapsible-section";
import { OwnerGroupedSection } from "@/components/public/owner-grouped-section";
import { SectionLocationFilter } from "@/components/public/section-location-filter";
import { PUBLIC_MEDIA_GRID_CLASS } from "@/lib/public-media-section";
import { VideoThumbnail } from "@/components/media/video-thumbnail";

interface ActivitiesSectionProps {
  activities: CampaignActivity[];
  groups: DataOwnerGroup<CampaignActivity>[];
}

function ActivityCard({ activity }: { activity: CampaignActivity }) {
  return (
    <Card className="h-full w-full overflow-hidden py-0 gap-0">
      <div className="relative aspect-video bg-muted">
        {activity.videoUrl && isDirectVideoUrl(activity.videoUrl) ? (
          <VideoThumbnail
            videoUrl={activity.videoUrl}
            alt={activity.title}
            className="object-cover"
          />
        ) : activity.imageUrl ? (
          <Image
            src={activity.imageUrl}
            alt={activity.title}
            fill
            className="object-cover"
            sizes="(max-width: 1280px) 16vw, 200px"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
            {getActivityTypeLabel(activity.activityType)}
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {getActivityTypeLabel(activity.activityType)}
          </Badge>
        </div>
      </div>

      <CardContent className="space-y-1 p-2.5">
        <h3 className="line-clamp-2 text-xs font-semibold leading-snug">{activity.title}</h3>
        <p className="text-[10px] text-muted-foreground">{formatPersianDate(activity.activityDate)}</p>
        {activity.location && (
          <p className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{activity.location}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityCards({ activities }: { activities: CampaignActivity[] }) {
  return (
    <div className={PUBLIC_MEDIA_GRID_CLASS}>
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

export function ActivitiesSection({ activities, groups }: ActivitiesSectionProps) {
  const filteredGroups = useFilteredOwnerGroups(groups);
  const filteredActivities = useMemo(
    () => filteredGroups.flatMap((group) => group.items),
    [filteredGroups]
  );

  const { visibleCount, hasMore, loadMore } = usePublicMediaPagination(
    filteredActivities.length,
    `activities:${filteredActivities.length}`
  );

  const visibleGroups = useMemo(() => {
    const visibleIds = new Set(
      filteredActivities.slice(0, visibleCount).map((activity) => activity.id)
    );
    return filteredGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((activity) => visibleIds.has(activity.id)),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredGroups, filteredActivities, visibleCount]);

  if (activities.length === 0) return null;

  return (
    <CollapsibleSection
      id="activities"
      title="اقدامات"
      description="فعالیت‌های میدانی و تبلیغاتی: مجله، روزنامه، تراکت، غرفه، برنامه فرهنگی و ..."
      controls={<SectionLocationFilter />}
    >
      {filteredActivities.length === 0 ? (
        <div className="rounded-xl border bg-card py-12 text-center text-muted-foreground">
          فعالیتی با فیلتر انتخاب‌شده یافت نشد.
        </div>
      ) : (
        <>
          <OwnerGroupedSection groups={visibleGroups}>
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
      )}
    </CollapsibleSection>
  );
}
