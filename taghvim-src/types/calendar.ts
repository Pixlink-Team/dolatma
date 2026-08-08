export type MediaItem = {
  id: number;
  url: string;
  alt: string | null;
  mime_type: string | null;
  sort_order: number;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  color: string;
  type: "enemy" | "government";
};

export type EnemyAction = {
  id: number;
  title: string;
  description: string | null;
  severity: "low" | "medium" | "high" | "critical";
  source: string | null;
  location: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  occurred_at: string | null;
  status: string;
  agency_id?: string | null;
  created_by?: number | null;
  date?: string | null;
  creator?: { id: number; name: string } | null;
  category?: Category | null;
  media?: MediaItem[];
};

export type GovernmentAction = {
  id: number;
  title: string;
  description: string | null;
  agency: string | null;
  location?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  completed_at: string | null;
  status: string;
  response_to_id: number | null;
  tags?: string[];
  agency_id?: string | null;
  created_by?: number | null;
  date?: string | null;
  creator?: { id: number; name: string } | null;
  category?: Category | null;
  media?: MediaItem[];
};

export type CalendarDay = {
  id: number;
  date: string;
  title: string | null;
  summary: string | null;
  status: string;
  is_featured: boolean;
  enemy_actions_count: number;
  government_actions_count: number;
  activity_score: number;
  media?: MediaItem[];
  enemy_actions?: EnemyAction[];
  government_actions?: GovernmentAction[];
};

export type TimelineStats = {
  total_days: number;
  total_enemy_actions: number;
  total_government_actions: number;
  response_ratio: number;
};

export type TimelineResponse = {
  data: CalendarDay[];
  meta: {
    max_activity_score: number;
    stats: TimelineStats;
  };
};
