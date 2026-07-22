import type { AdminRole } from "@/lib/types";

/** Upstream authority that issued a directive (or owns a user account). */
export type DirectiveAuthorityLevel =
  | "government"
  | "presidency"
  | "ministry"
  | "organization"
  | "province"
  | "municipality"
  | "internal"
  | "other";

export const DIRECTIVE_AUTHORITY_LEVELS = [
  "government",
  "presidency",
  "ministry",
  "organization",
  "province",
  "municipality",
  "internal",
  "other",
] as const satisfies readonly DirectiveAuthorityLevel[];

/** Lower number = higher rank (government first). */
export const AUTHORITY_RANK: Record<DirectiveAuthorityLevel, number> = {
  government: 0,
  presidency: 1,
  ministry: 2,
  organization: 3,
  province: 4,
  municipality: 5,
  internal: 6,
  other: 7,
};

const AUTHORITY_LABELS: Record<DirectiveAuthorityLevel, string> = {
  government: "دولت / هیئت دولت",
  presidency: "ریاست جمهوری",
  ministry: "وزارتخانه",
  organization: "سازمان / دستگاه زیرمجموعه",
  province: "استانداری / استانی",
  municipality: "شهرداری / شهری",
  internal: "داخلی سامانه / کارفرما",
  other: "سایر",
};

/** Short badge label, e.g. «از دولت». */
const AUTHORITY_BADGE_LABELS: Record<DirectiveAuthorityLevel, string> = {
  government: "از دولت",
  presidency: "از ریاست جمهوری",
  ministry: "از وزارتخانه",
  organization: "از سازمان",
  province: "از استانداری",
  municipality: "از شهرداری",
  internal: "داخلی سامانه",
  other: "سایر",
};

export function isDirectiveAuthorityLevel(value: unknown): value is DirectiveAuthorityLevel {
  return (
    typeof value === "string" &&
    (DIRECTIVE_AUTHORITY_LEVELS as readonly string[]).includes(value)
  );
}

export function mapDirectiveAuthorityLevel(value: unknown): DirectiveAuthorityLevel {
  return isDirectiveAuthorityLevel(value) ? value : "internal";
}

export function getAuthorityLabel(level: DirectiveAuthorityLevel | string | null | undefined): string {
  if (!isDirectiveAuthorityLevel(level)) return AUTHORITY_LABELS.internal;
  return AUTHORITY_LABELS[level];
}

export function getAuthorityBadgeLabel(
  level: DirectiveAuthorityLevel | string | null | undefined,
  otherText?: string | null
): string {
  if (!isDirectiveAuthorityLevel(level)) return AUTHORITY_BADGE_LABELS.internal;
  if (level === "other") {
    const trimmed = otherText?.trim();
    return trimmed ? `از ${trimmed}` : AUTHORITY_BADGE_LABELS.other;
  }
  return AUTHORITY_BADGE_LABELS[level];
}

export function compareByAuthority(
  a: DirectiveAuthorityLevel | string | null | undefined,
  b: DirectiveAuthorityLevel | string | null | undefined
): number {
  const rankA = AUTHORITY_RANK[mapDirectiveAuthorityLevel(a)];
  const rankB = AUTHORITY_RANK[mapDirectiveAuthorityLevel(b)];
  return rankA - rankB;
}

/** Sensible default when creating/editing a user account. */
export function inferDefaultAuthorityLevel(user: {
  role: AdminRole | string;
  organizationId?: string | null;
}): DirectiveAuthorityLevel {
  if (user.organizationId?.trim()) return "organization";
  if (user.role === "ministry_parent") return "ministry";
  return "internal";
}

export const DIRECTIVE_AUTHORITY_OPTIONS = DIRECTIVE_AUTHORITY_LEVELS.map((value) => ({
  value,
  label: AUTHORITY_LABELS[value],
}));
