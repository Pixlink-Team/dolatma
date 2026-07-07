import type { ActivityType, CampaignActivity } from "@/lib/types";

export const PRESS_ACTIVITY_TYPES: ActivityType[] = ["magazine", "newspaper"];

const pressTypeSet = new Set<string>(PRESS_ACTIVITY_TYPES);

export function isPressPublication(activity: Pick<CampaignActivity, "activityType">): boolean {
  return pressTypeSet.has(activity.activityType);
}

export function splitPressActivities(activities: CampaignActivity[]): {
  pressPublications: CampaignActivity[];
  fieldActivities: CampaignActivity[];
} {
  const pressPublications: CampaignActivity[] = [];
  const fieldActivities: CampaignActivity[] = [];

  for (const activity of activities) {
    if (isPressPublication(activity)) {
      pressPublications.push(activity);
    } else {
      fieldActivities.push(activity);
    }
  }

  return { pressPublications, fieldActivities };
}
