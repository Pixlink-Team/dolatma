export type {
  AppErrorCode,
  AppErrorGuide,
  AppErrorSeverity,
  ResolvedAppError,
} from "@/lib/app-errors/types";
export {
  resolveAppError,
  getAppErrorGuide,
  shouldIgnoreClientError,
  isStalePageError,
  refreshSite,
  GENERIC_APP_ERROR,
} from "@/lib/app-errors/catalog";
export {
  canAutoRefreshStalePage,
  scheduleAutoRefreshStalePage,
  refreshForNewBuild,
} from "@/lib/app-errors/stale-page-refresh";
