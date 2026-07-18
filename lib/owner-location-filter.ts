import type { DataOwnerGroup, Ownable } from "@/lib/types";
import { filterOwnerGroups } from "@/lib/owner-groups";
import { normalizeStoredUserEmail } from "@/lib/auth/user-login";
import { matchesDateFilter } from "@/lib/campaign-content-filter";
import { matchesPlanLabelFilter } from "@/lib/content-topics";

export const OWNER_LOCATION_ALL = "all";
export const OWNER_USER_ALL = "all";
export const OWNER_DATE_ALL = "all";
export const OWNER_PLAN_ALL = "all";
export const OWNER_MINISTRY_ALL = "all";
export const OWNER_ORGANIZATION_ALL = "all";
export const OWNER_TOP_SCORED = "top_scored";

export type CampaignDatePreset = "all" | "this_week" | "this_month" | "custom";
export type CampaignContentSort = "default" | "newest" | "oldest" | "top_scored";

export interface CampaignDateFilter {
  datePreset: CampaignDatePreset;
  dateFrom: string;
  dateTo: string;
}

export interface OwnerLocationFilter extends CampaignDateFilter {
  ministryId: string;
  organizationId: string;
  province: string;
  city: string;
  userKey: string;
  /** Empty array means all plan labels. */
  planLabels: string[];
  sortOrder: CampaignContentSort;
}

export const DEFAULT_OWNER_LOCATION_FILTER: OwnerLocationFilter = {
  ministryId: OWNER_MINISTRY_ALL,
  organizationId: OWNER_ORGANIZATION_ALL,
  province: OWNER_LOCATION_ALL,
  city: OWNER_LOCATION_ALL,
  userKey: OWNER_USER_ALL,
  planLabels: [],
  datePreset: OWNER_DATE_ALL,
  dateFrom: "",
  dateTo: "",
  sortOrder: "default",
};

export function isOwnerLocationFilterActive(filter: OwnerLocationFilter): boolean {
  return filter.province !== OWNER_LOCATION_ALL;
}

export function isOwnerMinistryFilterActive(filter: OwnerLocationFilter): boolean {
  return filter.ministryId !== OWNER_MINISTRY_ALL;
}

export function isOwnerOrganizationFilterActive(filter: OwnerLocationFilter): boolean {
  return filter.organizationId !== OWNER_ORGANIZATION_ALL;
}

export function isOwnerUserFilterActive(filter: OwnerLocationFilter): boolean {
  return filter.userKey !== OWNER_USER_ALL;
}

export function isOwnerPlanFilterActive(filter: OwnerLocationFilter): boolean {
  return filter.planLabels.length > 0;
}

export function isOwnerFilterActive(filter: OwnerLocationFilter): boolean {
  return (
    isOwnerLocationFilterActive(filter) ||
    isOwnerMinistryFilterActive(filter) ||
    isOwnerOrganizationFilterActive(filter) ||
    isOwnerUserFilterActive(filter) ||
    isOwnerPlanFilterActive(filter)
  );
}

function matchesPlanLabel(item: Ownable, filter: OwnerLocationFilter): boolean {
  if (filter.planLabels.length === 0) return true;
  return filter.planLabels.some((label) =>
    matchesPlanLabelFilter(item.planLabels, item.planLabel, label)
  );
}

function matchesOwnerUser(item: Ownable, filter: OwnerLocationFilter): boolean {
  if (filter.userKey === OWNER_USER_ALL) return true;
  if (!item.ownerUserId && !item.ownerEmail) return false;

  if (item.ownerUserId && item.ownerUserId === filter.userKey) return true;

  const itemEmail = item.ownerEmail?.trim().toLowerCase();
  const filterKey = filter.userKey.trim().toLowerCase();
  if (itemEmail && itemEmail === filterKey) return true;
  if (itemEmail && normalizeStoredUserEmail(itemEmail) === filterKey) return true;

  return false;
}

function resolveItemProvince(item: Ownable): string | null {
  const ownerProvince = item.ownerProvince?.trim();
  if (ownerProvince) return ownerProvince;
  const geoProvince =
    "province" in item && typeof (item as { province?: unknown }).province === "string"
      ? (item as { province?: string | null }).province?.trim()
      : undefined;
  return geoProvince || null;
}

function resolveItemCity(item: Ownable): string | null {
  const ownerCity = item.ownerCity?.trim();
  if (ownerCity) return ownerCity;
  const geoCity =
    "city" in item && typeof (item as { city?: unknown }).city === "string"
      ? (item as { city?: string | null }).city?.trim()
      : undefined;
  return geoCity || null;
}

function resolveItemMinistryId(item: Ownable): string | null {
  return item.ownerMinistryId?.trim() || null;
}

function resolveItemOrganizationId(item: Ownable): string | null {
  return item.ownerOrganizationId?.trim() || null;
}

function matchesOwnerMinistry(item: Ownable, filter: OwnerLocationFilter): boolean {
  if (filter.ministryId === OWNER_MINISTRY_ALL) return true;
  return resolveItemMinistryId(item) === filter.ministryId;
}

function matchesOwnerOrganization(item: Ownable, filter: OwnerLocationFilter): boolean {
  if (filter.organizationId === OWNER_ORGANIZATION_ALL) return true;
  return resolveItemOrganizationId(item) === filter.organizationId;
}

export function matchesOwnerLocation(
  item: Ownable,
  filter: OwnerLocationFilter,
  getItemDate?: (item: Ownable) => string | undefined
): boolean {
  if (!matchesPlanLabel(item, filter)) return false;
  if (!matchesOwnerUser(item, filter)) return false;
  if (!matchesOwnerMinistry(item, filter)) return false;
  if (!matchesOwnerOrganization(item, filter)) return false;

  if (filter.province === OWNER_LOCATION_ALL) {
    return matchesDateFilter(item, filter, getItemDate);
  }

  const itemProvince = resolveItemProvince(item);
  if (!itemProvince || itemProvince !== filter.province) return false;
  if (filter.city === OWNER_LOCATION_ALL) {
    return matchesDateFilter(item, filter, getItemDate);
  }

  const itemCity = resolveItemCity(item);
  if (!itemCity || itemCity !== filter.city) return false;

  return matchesDateFilter(item, filter, getItemDate);
}

export function filterOwnerGroupsByLocation<T extends Ownable>(
  groups: DataOwnerGroup<T>[],
  filter: OwnerLocationFilter,
  getItemDate?: (item: T) => string | undefined
): DataOwnerGroup<T>[] {
  return filterOwnerGroups(groups, (item) =>
    matchesOwnerLocation(item, filter, getItemDate as (item: Ownable) => string | undefined)
  );
}

export function filterItemsByOwnerLocation<T extends Ownable>(
  items: T[],
  filter: OwnerLocationFilter,
  getItemDate?: (item: T) => string | undefined
): T[] {
  return items.filter((item) =>
    matchesOwnerLocation(item, filter, getItemDate as (item: Ownable) => string | undefined)
  );
}

export interface OwnerMinistryOption {
  id: string;
  name: string;
}

export interface OwnerOrganizationOption {
  id: string;
  name: string;
  ministryId: string;
}

export function collectOwnerLocations(groups: DataOwnerGroup<Ownable>[]): {
  provinces: string[];
  citiesByProvince: Record<string, string[]>;
  ministries: OwnerMinistryOption[];
  organizations: OwnerOrganizationOption[];
} {
  const provinceSet = new Set<string>();
  const citiesByProvince = new Map<string, Set<string>>();
  const ministryMap = new Map<string, string>();
  const organizationMap = new Map<string, OwnerOrganizationOption>();

  const addLocation = (provinceRaw?: string | null, cityRaw?: string | null) => {
    const province = provinceRaw?.trim();
    const city = cityRaw?.trim();
    if (!province) return;
    provinceSet.add(province);
    if (!citiesByProvince.has(province)) {
      citiesByProvince.set(province, new Set());
    }
    if (city) {
      citiesByProvince.get(province)?.add(city);
    }
  };

  const addMinistry = (id?: string | null, name?: string | null) => {
    const ministryId = id?.trim();
    if (!ministryId) return;
    const ministryName = name?.trim() || "وزارتخانه";
    if (!ministryMap.has(ministryId)) {
      ministryMap.set(ministryId, ministryName);
    }
  };

  const addOrganization = (
    id?: string | null,
    name?: string | null,
    ministryId?: string | null
  ) => {
    const organizationId = id?.trim();
    const orgMinistryId = ministryId?.trim();
    if (!organizationId || !orgMinistryId) return;
    if (!organizationMap.has(organizationId)) {
      organizationMap.set(organizationId, {
        id: organizationId,
        name: name?.trim() || "زیرمجموعه",
        ministryId: orgMinistryId,
      });
    }
  };

  for (const group of groups) {
    addLocation(group.ownerProvince, group.ownerCity);
    addMinistry(group.ownerMinistryId, group.ownerMinistryName);
    addOrganization(group.ownerOrganizationId, group.ownerOrganizationName, group.ownerMinistryId);
    for (const item of group.items) {
      addLocation(resolveItemProvince(item), resolveItemCity(item));
      addMinistry(resolveItemMinistryId(item), item.ownerMinistryName);
      addOrganization(
        resolveItemOrganizationId(item),
        item.ownerOrganizationName,
        resolveItemMinistryId(item)
      );
    }
  }

  const provinces = [...provinceSet].sort((a, b) => a.localeCompare(b, "fa"));
  const citiesRecord: Record<string, string[]> = {};

  for (const province of provinces) {
    citiesRecord[province] = [...(citiesByProvince.get(province) ?? [])].sort((a, b) =>
      a.localeCompare(b, "fa")
    );
  }

  const ministries = [...ministryMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "fa"));

  const organizations = [...organizationMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "fa")
  );

  return { provinces, citiesByProvince: citiesRecord, ministries, organizations };
}
