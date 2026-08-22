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
  GENERIC_APP_ERROR,
} from "@/lib/app-errors/catalog";
