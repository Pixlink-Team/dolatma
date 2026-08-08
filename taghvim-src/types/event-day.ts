export type EventStatusColor = "red" | "orange" | "green" | "blue";

export type EventItem = {
  id: string;
  type: "enemy" | "government";
  title: string;
  description: string;
  time: string;
  image: string;
  status: string;
  statusColor: EventStatusColor;
  tags: string[];
};

export type EventDayDetail = {
  eventId: string;
  panelTitle: string;
  dateLabel: string;
  category: string;
  timeLabel: string;
  source: string;
  summary: string;
  evidenceImages: string[];
  evidenceExtraCount: number;
  impacts: string[];
  tags: string[];
  commentsCount: number;
};

export type EventDayMock = {
  dayTitle: string;
  eventCountLabel: string;
  events: EventItem[];
  details: Record<string, EventDayDetail>;
};
