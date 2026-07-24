import type { AuthSession } from "@/lib/types";
import type { MonitoringRole } from "@/lib/monitoring/types";

export type MonitoringCapability =
  | "view_dashboard"
  | "view_feed"
  | "create_item"
  | "review_item"
  | "manage_trends"
  | "convert_to_case"
  | "manage_cases"
  | "assign_case"
  | "manage_actions"
  | "produce_content"
  | "publish"
  | "close_case"
  | "view_archive"
  | "view_org_intelligence"
  | "manage_settings"
  | "send_command"
  | "view_analytics";

const ROLE_CAPABILITIES: Record<MonitoringRole, MonitoringCapability[]> = {
  super_admin: [
    "view_dashboard",
    "view_feed",
    "create_item",
    "review_item",
    "manage_trends",
    "convert_to_case",
    "manage_cases",
    "assign_case",
    "manage_actions",
    "produce_content",
    "publish",
    "close_case",
    "view_archive",
    "view_org_intelligence",
    "manage_settings",
    "send_command",
    "view_analytics",
  ],
  central_command_manager: [
    "view_dashboard",
    "view_feed",
    "create_item",
    "review_item",
    "manage_trends",
    "convert_to_case",
    "manage_cases",
    "assign_case",
    "manage_actions",
    "close_case",
    "view_archive",
    "view_org_intelligence",
    "manage_settings",
    "send_command",
    "view_analytics",
  ],
  monitoring_manager: [
    "view_dashboard",
    "view_feed",
    "create_item",
    "review_item",
    "manage_trends",
    "convert_to_case",
    "manage_cases",
    "view_archive",
    "view_org_intelligence",
    "view_analytics",
  ],
  monitoring_operator: [
    "view_dashboard",
    "view_feed",
    "create_item",
    "review_item",
    "view_archive",
  ],
  organization_manager: [
    "view_dashboard",
    "view_feed",
    "manage_cases",
    "assign_case",
    "manage_actions",
    "produce_content",
    "publish",
    "close_case",
    "view_archive",
    "view_org_intelligence",
    "view_analytics",
  ],
  public_relations_manager: [
    "view_dashboard",
    "view_feed",
    "manage_cases",
    "manage_actions",
    "produce_content",
    "publish",
    "view_archive",
    "view_analytics",
  ],
  shift_officer: [
    "view_dashboard",
    "view_feed",
    "manage_actions",
    "assign_case",
  ],
  content_manager: [
    "view_dashboard",
    "view_feed",
    "produce_content",
    "manage_actions",
  ],
  analyst: [
    "view_dashboard",
    "view_feed",
    "view_archive",
    "view_org_intelligence",
    "view_analytics",
  ],
  viewer: ["view_dashboard", "view_feed", "view_archive"],
};

/** Map existing app roles onto monitoring capability roles. */
export function resolveMonitoringRole(session: AuthSession | null): MonitoringRole {
  if (!session) return "viewer";
  if (session.type === "env_admin" || session.role === "admin") return "super_admin";
  if (session.role === "client") return "central_command_manager";
  if (session.role === "ministry_parent") return "organization_manager";
  if (session.role === "sub_user") return "content_manager";
  return "monitoring_operator";
}

export function hasMonitoringCapability(
  session: AuthSession | null,
  capability: MonitoringCapability
): boolean {
  const role = resolveMonitoringRole(session);
  return ROLE_CAPABILITIES[role].includes(capability);
}

export function assertMonitoringCapability(
  session: AuthSession | null,
  capability: MonitoringCapability
): void {
  if (!hasMonitoringCapability(session, capability)) {
    throw new Error("دسترسی لازم برای این عملیات را ندارید.");
  }
}
