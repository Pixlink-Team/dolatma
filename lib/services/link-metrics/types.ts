export type LinkMetricsPlatform = "eitaa" | "bale" | "soroush" | "rubika" | "unsupported";

export interface LinkMetricsResult {
  platform: LinkMetricsPlatform;
  supported: boolean;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  title?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  publishedDate?: string | null;
  subscribers?: number | null;
  error?: string;
}

export interface ParsedEitaaPostUrl {
  channelId: string;
  messageId: number;
}
