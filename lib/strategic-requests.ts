export const STRATEGIC_REQUEST_STATUSES = [
  "pending",
  "reviewing",
  "answered",
  "closed",
] as const;

export type StrategicRequestStatus = (typeof STRATEGIC_REQUEST_STATUSES)[number];

export type StrategicUpwardRequest = {
  id: string;
  campaignId: string;
  requesterUserId: string;
  requesterName: string | null;
  requesterEmail: string | null;
  targetUserId: string | null;
  targetName: string | null;
  title: string;
  body: string;
  status: StrategicRequestStatus;
  responseBody: string | null;
  respondedByUserId: string | null;
  respondedByName: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function isStrategicRequestStatus(value: unknown): value is StrategicRequestStatus {
  return (
    typeof value === "string" &&
    (STRATEGIC_REQUEST_STATUSES as readonly string[]).includes(value)
  );
}

export const STRATEGIC_REQUEST_STATUS_LABELS: Record<StrategicRequestStatus, string> = {
  pending: "در انتظار بررسی",
  reviewing: "در حال بررسی",
  answered: "پاسخ داده‌شده",
  closed: "بسته",
};
