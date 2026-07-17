import {
  detectLinkMetricsPlatform,
  getLinkMetricsSupportMessage,
} from "./detect";
import { fetchAparatPostMetrics } from "./aparat";
import { fetchEitaaPostMetrics } from "./eitaa";
import { fetchWebPageMetrics } from "./web-page";
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

  if (platform === "aparat") {
    return fetchAparatPostMetrics(trimmed);
  }

  if (platform === "web") {
    return fetchWebPageMetrics(trimmed);
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
  isAparatUrl,
  isEitaaUrl,
  isHttpUrl,
} from "./detect";
export type { LinkMetricsResult, LinkMetricsPlatform } from "./types";
