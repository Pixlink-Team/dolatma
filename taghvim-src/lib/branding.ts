import {
  defaultDashboardSettings,
  type DashboardSettings,
} from "@taghvim/types/settings";
import { getDashboardSettings } from "@taghvim/lib/admin-store";

export const SITE_TITLE = defaultDashboardSettings.siteTitle;
export const SITE_TAGLINE = defaultDashboardSettings.siteTagline;

export function getSiteBranding(): Pick<
  DashboardSettings,
  "siteTitle" | "siteTagline" | "siteSlogan"
> {
  if (typeof window === "undefined") {
    return {
      siteTitle: SITE_TITLE,
      siteTagline: SITE_TAGLINE,
      siteSlogan: defaultDashboardSettings.siteSlogan,
    };
  }

  const settings = getDashboardSettings();
  return {
    siteTitle: settings.siteTitle?.trim() || SITE_TITLE,
    siteTagline: settings.siteTagline?.trim() || SITE_TAGLINE,
    siteSlogan:
      settings.siteSlogan?.trim() || defaultDashboardSettings.siteSlogan,
  };
}
