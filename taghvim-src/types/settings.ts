export type DashboardSettings = {
  /** Inclusive start of timeline range (YYYY-MM-DD) */
  rangeStart: string;
  /** Inclusive end of timeline range (YYYY-MM-DD) */
  rangeEnd: string;
  siteTitle: string;
  siteTagline: string;
  /** Top banner slogan */
  siteSlogan: string;
  liveEnabled: boolean;
  defaultView: "timeline" | "week" | "month";
  showEnemySection: boolean;
  showGovernmentSection: boolean;
  timezoneLabel: string;
};

export const defaultDashboardSettings: DashboardSettings = {
  rangeStart: "",
  rangeEnd: "",
  siteTitle: "تقویم دفاع ملی",
  siteTagline: "دبیرخانه شورای اطلاع رسانی دولت",
  siteSlogan: "دولت پای کار مردم",
  liveEnabled: true,
  defaultView: "timeline",
  showEnemySection: true,
  showGovernmentSection: true,
  timezoneLabel: "Asia/Tehran",
};
