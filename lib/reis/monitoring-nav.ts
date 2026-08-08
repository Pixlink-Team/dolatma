import { REIS_HOME_PATH } from "@/lib/reis/sections";

export const REIS_MONITORING_BASE = `${REIS_HOME_PATH}/monitoring`;

/** Nav items for the reis monitoring surface (all under /admin/reis/monitoring). */
export const REIS_MONITORING_NAV = [
  { href: REIS_MONITORING_BASE, label: "نمای مدیریتی", exact: true as const },
  { href: `${REIS_MONITORING_BASE}/dashboard`, label: "داشبورد رصد" },
  { href: `${REIS_MONITORING_BASE}/feed`, label: "جریان رصد" },
  { href: `${REIS_MONITORING_BASE}/items/new`, label: "ثبت خبر منفی" },
  { href: `${REIS_MONITORING_BASE}/trends`, label: "ترندها" },
  { href: `${REIS_MONITORING_BASE}/cases`, label: "واکنش سریع" },
  { href: `${REIS_MONITORING_BASE}/archive`, label: "بانک خبر و تحلیل" },
  { href: `${REIS_MONITORING_BASE}/settings`, label: "تنظیمات رصد" },
] as const;
