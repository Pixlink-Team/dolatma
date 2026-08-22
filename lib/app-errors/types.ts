export type AppErrorSeverity = "info" | "warning" | "error";

export type AppErrorCode =
  | "generic"
  | "unauthorized"
  | "database"
  | "validation_required"
  | "validation_choice"
  | "duplicate"
  | "linked_users"
  | "has_children"
  | "cannot_delete_home"
  | "device_cycle"
  | "device_delete_blocked"
  | "upload_required"
  | "upload_type"
  | "upload_size"
  | "upload_failed"
  | "permission"
  | "campaign_missing"
  | "save_failed"
  | "delete_failed"
  | "rate_limit"
  | "login_failed"
  | "network"
  | "stale_page"
  | "client_crash"
  | "not_found"
  | "tutorial_blocked";

export interface AppErrorGuide {
  code: AppErrorCode;
  /** Short headline shown in the modal. */
  title: string;
  /** Why this happened — user-facing. */
  why: string;
  /** What the user should do now. */
  whatToDo: string;
  severity: AppErrorSeverity;
  /** When true, open the modal (not only a toast). */
  showModal: boolean;
}

export interface ResolvedAppError extends AppErrorGuide {
  /** Original message shown to the user / stored in audit. */
  message: string;
}
