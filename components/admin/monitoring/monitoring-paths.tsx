"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { REIS_MONITORING_BASE } from "@/lib/reis/monitoring-nav";

type MonitoringPaths = {
  dashboard: string;
  feed: string;
  newItem: string;
  item: (id: string) => string;
  trends: string;
  cases: string;
  caseDetail: (id: string) => string;
  archive: string;
  settings: string;
  organization: (id: string) => string;
  overview?: string;
};

const ADMIN_PATHS: MonitoringPaths = {
  dashboard: "/admin/monitoring/dashboard",
  feed: "/admin/monitoring/feed",
  newItem: "/admin/monitoring/items/new",
  item: (id) => `/admin/monitoring/items/${id}`,
  trends: "/admin/monitoring/trends",
  cases: "/admin/rapid-response/cases",
  caseDetail: (id) => `/admin/rapid-response/cases/${id}`,
  archive: "/admin/monitoring/archive",
  settings: "/admin/monitoring/settings",
  organization: (id) => `/admin/monitoring/organizations/${id}`,
};

const REIS_PATHS: MonitoringPaths = {
  overview: REIS_MONITORING_BASE,
  dashboard: `${REIS_MONITORING_BASE}/dashboard`,
  feed: `${REIS_MONITORING_BASE}/feed`,
  newItem: `${REIS_MONITORING_BASE}/items/new`,
  item: (id) => `${REIS_MONITORING_BASE}/items/${id}`,
  trends: `${REIS_MONITORING_BASE}/trends`,
  cases: `${REIS_MONITORING_BASE}/cases`,
  caseDetail: (id) => `${REIS_MONITORING_BASE}/cases/${id}`,
  archive: `${REIS_MONITORING_BASE}/archive`,
  settings: `${REIS_MONITORING_BASE}/settings`,
  organization: (id) => `${REIS_MONITORING_BASE}/organizations/${id}`,
};

const MonitoringPathsContext = createContext<MonitoringPaths>(ADMIN_PATHS);

export function MonitoringPathsProvider({
  mode = "admin",
  children,
}: {
  mode?: "admin" | "reis";
  children: ReactNode;
}) {
  const value = useMemo(() => (mode === "reis" ? REIS_PATHS : ADMIN_PATHS), [mode]);
  return (
    <MonitoringPathsContext.Provider value={value}>{children}</MonitoringPathsContext.Provider>
  );
}

export function useMonitoringPaths() {
  return useContext(MonitoringPathsContext);
}
