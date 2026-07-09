"use client";

import { useMemo } from "react";
import { isCampaignContentFilterActive } from "@/lib/campaign-content-filter";
import { useOwnerLocationFilter } from "@/lib/context/owner-location-filter-context";

export function useCampaignSectionVisibility(totalCount: number, filteredCount: number): boolean {
  const { filter } = useOwnerLocationFilter();
  const filterActive = isCampaignContentFilterActive(filter);

  return useMemo(() => {
    if (totalCount === 0) return false;
    if (filterActive && filteredCount === 0) return false;
    return true;
  }, [totalCount, filteredCount, filterActive]);
}
