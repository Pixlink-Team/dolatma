import {
  detectLinkMetricsPlatform,
  getLinkMetricsSupportMessage,
} from "./detect";
import { fetchEitaaPostMetrics } from "./eitaa";
import type { LinkMetricsResult } from "./types";

export async function fetchSocialLinkMetrics(
  url: string,
  declaredPlatform?: string | null
): Promise<LinkMetricsResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    return {
      platform: "unsupported",
      supported: false,
      error: "لینک خالی است.",
    };
  }

  const platform = detectLinkMetricsPlatform(trimmed, declaredPlatform);

  if (platform === "eitaa") {
    return fetchEitaaPostMetrics(trimmed);
  }

  if (platform === "unsupported") {
    return {
      platform,
      supported: false,
      error: getLinkMetricsSupportMessage(platform),
    };
  }

  return {
    platform,
    supported: false,
    error: getLinkMetricsSupportMessage(platform),
  };
}

export {
  detectLinkMetricsPlatform,
  getLinkMetricsSupportMessage,
  isEitaaUrl,
} from "./detect";
export type { LinkMetricsResult, LinkMetricsPlatform } from "./types";
