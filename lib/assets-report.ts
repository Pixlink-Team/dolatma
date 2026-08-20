import type { CapacityMapItem, DeviceCapacityType } from "@/lib/types";

export type AssetsSortBy = "updatedAt" | "title" | "type" | "source";
export type AssetsSortOrder = "asc" | "desc";

export interface AssetsReportQuery {
  page?: number;
  pageSize?: number;
  sortBy?: AssetsSortBy;
  sortOrder?: AssetsSortOrder;
  q?: string | null;
}

export interface AssetsReportResult {
  items: CapacityMapItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AssetsSummary {
  total: number;
  active: number;
  inactive: number;
  deviceSource: number;
  userSource: number;
  byType: Partial<Record<DeviceCapacityType, number>>;
}

const DEFAULT_PAGE_SIZE = 50;

function normalizeQuery(query?: AssetsReportQuery) {
  const page = Math.max(1, Math.trunc(query?.page ?? 1));
  const pageSize = Math.min(200, Math.max(10, Math.trunc(query?.pageSize ?? DEFAULT_PAGE_SIZE)));
  const sortBy = query?.sortBy ?? "updatedAt";
  const sortOrder = query?.sortOrder ?? "desc";
  const q = query?.q?.trim().toLocaleLowerCase("fa-IR") ?? "";
  return { page, pageSize, sortBy, sortOrder, q };
}

function compareValues(
  a: CapacityMapItem,
  b: CapacityMapItem,
  sortBy: AssetsSortBy,
  sortOrder: AssetsSortOrder
) {
  const factor = sortOrder === "asc" ? 1 : -1;
  if (sortBy === "updatedAt") {
    return (
      (new Date(a.lastUpdatedAt).getTime() - new Date(b.lastUpdatedAt).getTime()) * factor
    );
  }
  if (sortBy === "title") {
    return a.title.localeCompare(b.title, "fa") * factor;
  }
  if (sortBy === "type") {
    return a.capacityType.localeCompare(b.capacityType, "en") * factor;
  }
  return a.source.localeCompare(b.source, "en") * factor;
}

export function buildAssetsSummary(items: CapacityMapItem[]): AssetsSummary {
  const byType: Partial<Record<DeviceCapacityType, number>> = {};
  let active = 0;
  let inactive = 0;
  let deviceSource = 0;
  let userSource = 0;
  for (const item of items) {
    byType[item.capacityType] = (byType[item.capacityType] ?? 0) + 1;
    if (item.isActive) active += 1;
    else inactive += 1;
    if (item.source === "device") deviceSource += 1;
    else userSource += 1;
  }
  return {
    total: items.length,
    active,
    inactive,
    deviceSource,
    userSource,
    byType,
  };
}

export function buildAssetsReport(items: CapacityMapItem[], query?: AssetsReportQuery): AssetsReportResult {
  const { page, pageSize, sortBy, sortOrder, q } = normalizeQuery(query);
  let filtered = items;
  if (q) {
    filtered = items.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        item.ownerName,
        item.userName,
        item.deviceName,
        item.mapProvince,
        item.mapCity,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fa-IR");
      return haystack.includes(q);
    });
  }
  const sorted = [...filtered].sort((a, b) => compareValues(a, b, sortBy, sortOrder));
  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const itemsSlice = sorted.slice(start, start + pageSize);
  return {
    items: itemsSlice,
    totalCount,
    page: safePage,
    pageSize,
    totalPages,
  };
}
