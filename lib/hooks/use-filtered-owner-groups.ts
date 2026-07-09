"use client";

import { useMemo } from "react";
import type { DataOwnerGroup, Ownable } from "@/lib/types";
import { useOwnerLocationFilter } from "@/lib/context/owner-location-filter-context";
import { getOwnableUploadDate, sortCampaignContent } from "@/lib/campaign-content-filter";
import {
  filterItemsByOwnerLocation,
  filterOwnerGroupsByLocation,
} from "@/lib/owner-location-filter";

export function useFilteredOwnerGroups<T extends Ownable>(
  groups: DataOwnerGroup<T>[],
  getItemDate?: (item: T) => string | undefined
): DataOwnerGroup<T>[] {
  const { filter } = useOwnerLocationFilter();

  return useMemo(() => {
    const filtered = filterOwnerGroupsByLocation(groups, filter, getItemDate);
    if (filter.sortOrder === "default") return filtered;

    return filtered
      .map((group) => ({
        ...group,
        items: sortCampaignContent(
          group.items,
          filter.sortOrder,
          (item) => getOwnableUploadDate(item as T & Record<string, unknown>),
          (item) => ("sortOrder" in item ? Number(item.sortOrder) : 0) || 0
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, filter, getItemDate]);
}

export function useFilteredOwnableItems<T extends Ownable>(
  items: T[],
  getItemDate?: (item: T) => string | undefined
): T[] {
  const { filter } = useOwnerLocationFilter();

  return useMemo(() => {
    const filtered = filterItemsByOwnerLocation(items, filter, getItemDate);
    if (filter.sortOrder === "default") return filtered;

    return sortCampaignContent(
      filtered,
      filter.sortOrder,
      (item) => getOwnableUploadDate(item as T & Record<string, unknown>),
      (item) => ("sortOrder" in item ? Number(item.sortOrder) : 0) || 0
    );
  }, [items, filter, getItemDate]);
}
