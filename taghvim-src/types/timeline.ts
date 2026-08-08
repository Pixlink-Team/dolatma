export type EventType = "enemy" | "government";

export type Severity = "low" | "medium" | "high" | "critical";

export type VerificationStatus =
  | "draft"
  | "pending"
  | "verified"
  | "rejected"
  | "published";

export type GovernmentActionStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "successful"
  | "needs_follow_up";

export type TimelineViewMode =
  | "timeline"
  | "day"
  | "week"
  | "month"
  | "map"
  | "analytics"
  | "heatmap";

export type TimelineMedia = {
  id: string;
  type: "image" | "video" | "audio" | "document";
  url: string;
  thumbnailUrl?: string;
  title?: string;
  alt?: string;
};

export type TimelineEvent = {
  id: string;
  eventType: EventType;
  title: string;
  summary: string;
  description?: string;
  impact?: string;
  date: string;
  time: string;
  severity: Severity;
  verificationStatus: VerificationStatus;
  actionStatus?: GovernmentActionStatus;
  category: string;
  location?: {
    province?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };
  organization?: string;
  /** Owning / responsible government agency (ministry) */
  agencyId?: string;
  agencyName?: string;
  /** Creator user id (for ministry-scoped filtering) */
  createdByUserId?: string;
  /** Display name of the creator (from API) */
  createdByName?: string;
  /** Ministries assigned to the creator at publish time */
  createdByAgencyIds?: string[];
  source?: string;
  imageUrl?: string;
  media?: TimelineMedia[];
  tags?: string[];
  relatedEventIds?: string[];
  relatedResponseIds?: string[];
  responseTimeMinutes?: number;
  commentsCount?: number;
  editHistory?: { at: string; by: string; note: string }[];
  createdAt: string;
  updatedAt: string;
  /**
   * Admin-only: other reports of the same enemy action (same day / similar title).
   * Present only on the representative event of a duplicate cluster.
   */
  duplicateReports?: Array<{
    id: string;
    title: string;
    createdByUserId?: string;
    createdByName?: string;
    createdAt: string;
    agencyName?: string;
  }>;
};

export type TimelineDay = {
  date: string;
  persianDate: string;
  weekday: string;
  totalEvents: number;
  enemyActionsCount: number;
  governmentActionsCount: number;
  intensity: number;
  events: TimelineEvent[];
  isCritical?: boolean;
};

export type TimelineFiltersState = {
  eventType: EventType | "all";
  severity: Severity | "all";
  category: string | "all";
  province: string | "all";
  city: string | "all";
  organization: string | "all";
  /** Filter by government agency / ministry across the whole site */
  agencyId: string | "all";
  verificationStatus: VerificationStatus | "all";
  hasResponse: "all" | "yes" | "no";
  hasImage: boolean;
  hasVideo: boolean;
  source: string | "all";
  dateFrom: string;
  dateTo: string;
};

export type ActiveFilterChip = {
  key: string;
  label: string;
};

export const defaultFilters: TimelineFiltersState = {
  eventType: "all",
  severity: "all",
  category: "all",
  province: "all",
  city: "all",
  organization: "all",
  agencyId: "all",
  verificationStatus: "all",
  hasResponse: "all",
  hasImage: false,
  hasVideo: false,
  source: "all",
  dateFrom: "",
  dateTo: "",
};
