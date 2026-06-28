"use client";

import { useState } from "react";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { getActivityTypeLabel } from "@/lib/activity-types";
import { useCampaignExportMode } from "@/lib/context/campaign-export-context";
import type { CampaignActivity, DataOwnerGroup } from "@/lib/types";
import { formatPersianDate, formatPersianNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/public/collapsible-section";
import { OwnerGroupedSection } from "@/components/public/owner-grouped-section";

const ACTIVITIES_INITIAL_COUNT = 8;
const ACTIVITIES_PAGE_SIZE = 8;

interface ActivitiesSectionProps {
  activities: CampaignActivity[];
  groups: DataOwnerGroup<CampaignActivity>[];
}

function ActivityCards({ activities }: { activities: CampaignActivity[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {activities.map((activity) => (
        <Card key={activity.id} className="overflow-hidden h-full flex flex-col">
          <div className="relative aspect-[4/3] bg-muted">
            {activity.imageUrl ? (
              <Image
                src={activity.imageUrl}
                alt={activity.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground px-4 text-center">
                {getActivityTypeLabel(activity.activityType)}
              </div>
            )}
          </div>
          <CardContent className="p-4 space-y-2 flex-1 flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{getActivityTypeLabel(activity.activityType)}</Badge>
              <span className="text-xs text-muted-foreground">{formatPersianDate(activity.activityDate)}</span>
            </div>
            <h3 className="font-semibold text-sm line-clamp-2">{activity.title}</h3>
            {activity.location && (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {activity.location}
              </p>
            )}
            {activity.description && (
              <p className="text-sm text-muted-foreground line-clamp-4 flex-1">{activity.description}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ActivitiesSection({ activities, groups }: ActivitiesSectionProps) {
  const exportMode = useCampaignExportMode();
  const [visibleCount, setVisibleCount] = useState(ACTIVITIES_INITIAL_COUNT);
  const effectiveCount = exportMode ? activities.length : visibleCount;
  const visibleIds = new Set(activities.slice(0, effectiveCount).map((activity) => activity.id));
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((activity) => visibleIds.has(activity.id)),
    }))
    .filter((group) => group.items.length > 0);
  const hasMore = !exportMode && visibleCount < activities.length;

  if (activities.length === 0) return null;

  return (
    <CollapsibleSection
      id="activities"
      title="اقدامات"
      description="فعالیت‌های میدانی و تبلیغاتی: مجله، روزنامه، تراکت، غرفه، برنامه فرهنگی و ..."
    >
      <OwnerGroupedSection groups={visibleGroups}>
        {(groupActivities) => <ActivityCards activities={groupActivities} />}
      </OwnerGroupedSection>

      {hasMore && (
        <div className="flex justify-center mt-4" data-export-hide>
          <Button variant="outline" onClick={() => setVisibleCount((count) => count + ACTIVITIES_PAGE_SIZE)}>
            مشاهده بیشتر ({formatPersianNumber(activities.length - visibleCount)} باقی‌مانده)
          </Button>
        </div>
      )}
    </CollapsibleSection>
  );
}
