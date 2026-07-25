/**
 * Organizational position within a device (ministry or subtree node).
 * Extensible later — keep presets in org-role-presets.ts in sync.
 */
export const ORG_ROLES = ["primary", "supervisor", "deputy", "pr"] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  primary: "مدیر",
  supervisor: "ناظر",
  deputy: "معاون",
  pr: "روابط عمومی",
};

export function isOrgRole(value: unknown): value is OrgRole {
  return typeof value === "string" && (ORG_ROLES as readonly string[]).includes(value);
}

export function mapOrgRole(value: unknown): OrgRole | null {
  return isOrgRole(value) ? value : null;
}

export function getOrgRoleLabel(role: OrgRole | string | null | undefined): string {
  if (!isOrgRole(role)) return "—";
  return ORG_ROLE_LABELS[role];
}
