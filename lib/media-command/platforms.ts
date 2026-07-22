/**
 * Extensible social/media platform connectors for Media Command Center.
 * UI enables features based on each connector's declared capabilities.
 */

export type MediaPlatformId =
  | "org_site"
  | "telegram"
  | "bale"
  | "eitaa"
  | "rubika"
  | "soroush"
  | "instagram"
  | "linkedin"
  | "x"
  | "aparat"
  | "youtube"
  | "other";

export interface MediaConnectorCapabilities {
  publishText: boolean;
  publishImage: boolean;
  publishVideo: boolean;
  scheduling: boolean;
  publishStatus: boolean;
  analytics: boolean;
  comments: boolean;
  reply: boolean;
  refreshConnection: boolean;
  errorReporting: boolean;
  maxTextLength: number | null;
}

export interface MediaPlatformDefinition {
  id: MediaPlatformId;
  label: string;
  capabilities: MediaConnectorCapabilities;
}

const FULL_CAPS: MediaConnectorCapabilities = {
  publishText: true,
  publishImage: true,
  publishVideo: true,
  scheduling: true,
  publishStatus: true,
  analytics: true,
  comments: true,
  reply: true,
  refreshConnection: true,
  errorReporting: true,
  maxTextLength: null,
};

export const MEDIA_PLATFORMS: MediaPlatformDefinition[] = [
  {
    id: "org_site",
    label: "سایت سازمان",
    capabilities: {
      ...FULL_CAPS,
      comments: false,
      reply: false,
      maxTextLength: null,
    },
  },
  {
    id: "telegram",
    label: "تلگرام",
    capabilities: { ...FULL_CAPS, maxTextLength: 4096 },
  },
  {
    id: "bale",
    label: "بله",
    capabilities: { ...FULL_CAPS, maxTextLength: 4096 },
  },
  {
    id: "eitaa",
    label: "ایتا",
    capabilities: { ...FULL_CAPS, maxTextLength: 4096 },
  },
  {
    id: "rubika",
    label: "روبیکا",
    capabilities: { ...FULL_CAPS, maxTextLength: 2000 },
  },
  {
    id: "soroush",
    label: "سروش",
    capabilities: { ...FULL_CAPS, maxTextLength: 4096 },
  },
  {
    id: "instagram",
    label: "اینستاگرام",
    capabilities: { ...FULL_CAPS, maxTextLength: 2200 },
  },
  {
    id: "linkedin",
    label: "لینکدین",
    capabilities: { ...FULL_CAPS, maxTextLength: 3000 },
  },
  {
    id: "x",
    label: "ایکس",
    capabilities: { ...FULL_CAPS, maxTextLength: 280 },
  },
  {
    id: "aparat",
    label: "آپارات",
    capabilities: {
      ...FULL_CAPS,
      publishText: true,
      publishImage: false,
      maxTextLength: 5000,
    },
  },
  {
    id: "youtube",
    label: "یوتیوب",
    capabilities: {
      ...FULL_CAPS,
      publishImage: false,
      maxTextLength: 5000,
    },
  },
  {
    id: "other",
    label: "سایر کانال‌ها",
    capabilities: {
      ...FULL_CAPS,
      comments: false,
      reply: false,
      analytics: false,
      maxTextLength: null,
    },
  },
];

const platformMap = new Map(MEDIA_PLATFORMS.map((p) => [p.id, p]));

export function getMediaPlatform(id: string): MediaPlatformDefinition | undefined {
  return platformMap.get(id as MediaPlatformId);
}

export function getMediaPlatformLabel(id: string): string {
  return getMediaPlatform(id)?.label ?? id;
}

export function isMediaPlatformId(value: unknown): value is MediaPlatformId {
  return typeof value === "string" && platformMap.has(value as MediaPlatformId);
}
