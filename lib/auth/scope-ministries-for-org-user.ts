import type { AdminUser, Device, Ministry, MinistryOrganization } from "@/lib/types";

/**
 * Scope ministry/org options for an org_user managing subtree users.
 * - Ministry-level (no organizationId): only their ministry, all of its orgs.
 * - Subunit-level: only their home node + device-tree descendants (not peer orgs).
 */
export function scopeMinistriesForOrgUser(
  ministries: Ministry[],
  parentUser: Pick<
    AdminUser,
    "ministryId" | "organizationId" | "organizationName" | "createdAt"
  >,
  accessibleDevices: Device[] = []
): Ministry[] {
  const ministryId = parentUser.ministryId?.trim() || null;
  if (!ministryId) return [];

  const ministry = ministries.find((item) => item.id === ministryId);
  if (!ministry) return [];

  const existingOrgs = ministry.organizations ?? [];
  const organizationId = parentUser.organizationId?.trim() || null;

  if (!organizationId) {
    return [{ ...ministry, organizations: existingOrgs }];
  }

  const existingById = new Map(existingOrgs.map((org) => [org.id, org]));
  const options: MinistryOrganization[] = [];
  const seen = new Set<string>();

  const pushOption = (org: MinistryOrganization) => {
    if (seen.has(org.id)) return;
    seen.add(org.id);
    options.push(org);
  };

  // Prefer device-tree order (home first from listAccessibleDevices).
  for (const device of accessibleDevices) {
    if (device.id === ministryId) continue;
    const existing = existingById.get(device.id);
    if (existing) {
      pushOption({
        ...existing,
        parentId: existing.parentId ?? device.parentId ?? null,
      });
      continue;
    }
    pushOption({
      id: device.id,
      ministryId,
      name: device.shortName?.trim() || device.name,
      fullName: device.name,
      isActive: device.status !== "inactive",
      createdAt: device.createdAt,
      parentId: device.parentId ?? null,
    });
  }

  if (!seen.has(organizationId)) {
    const existing = existingById.get(organizationId);
    pushOption(
      existing ?? {
        id: organizationId,
        ministryId,
        name: parentUser.organizationName?.trim() || "زیرمجموعه شما",
        fullName: null,
        isActive: true,
        createdAt: parentUser.createdAt,
        parentId: null,
      }
    );
  }

  return [{ ...ministry, organizations: options }];
}
