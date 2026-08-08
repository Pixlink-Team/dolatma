export type NotificationCategory = "enemy_action" | "government_action";

export type AppNotification = {
  id: string;
  type: string;
  category: NotificationCategory | string | null;
  kind: "enemy" | "government" | string | null;
  action_id: number | null;
  title: string | null;
  actor_id: number | null;
  actor_name: string | null;
  date: string | null;
  message: string | null;
  read_at: string | null;
  created_at: string | null;
  is_read: boolean;
};

export type NotificationStatusFilter = "all" | "unread" | "read";
export type NotificationCategoryFilter = "all" | NotificationCategory;
