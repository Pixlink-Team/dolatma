"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { OwnerFilterOption } from "@/lib/owner-users";
import {
  collectOwnerLocations,
  DEFAULT_OWNER_LOCATION_FILTER,
  OWNER_LOCATION_ALL,
  OWNER_MINISTRY_ALL,
  OWNER_ORGANIZATION_ALL,
  OWNER_USER_ALL,
  type OwnerLocationFilter,
  type OwnerMinistryOption,
  type OwnerOrganizationOption,
} from "@/lib/owner-location-filter";
import type { DataOwnerGroup, Ownable } from "@/lib/types";
import type { CampaignContentSort, CampaignDatePreset } from "@/lib/owner-location-filter";

export interface CampaignOwnerLocations {
  provinces: string[];
  citiesByProvince: Record<string, string[]>;
  ministries: OwnerMinistryOption[];
  organizations: OwnerOrganizationOption[];
}

interface OwnerLocationFilterContextValue {
  filter: OwnerLocationFilter;
  setMinistryId: (ministryId: string) => void;
  setOrganizationId: (organizationId: string) => void;
  setProvince: (province: string) => void;
  setCity: (city: string) => void;
  setUserKey: (userKey: string) => void;
  setDatePreset: (preset: CampaignDatePreset) => void;
  setDateFrom: (dateFrom: string) => void;
  setDateTo: (dateTo: string) => void;
  setSortOrder: (sortOrder: CampaignContentSort) => void;
  setPlanLabels: (planLabels: string[]) => void;
  togglePlanLabel: (planLabel: string) => void;
  resetFilters: () => void;
  provinces: string[];
  cities: string[];
  ministries: OwnerMinistryOption[];
  organizations: OwnerOrganizationOption[];
  plans: string[];
  users: OwnerFilterOption[];
}

const OwnerLocationFilterContext = createContext<OwnerLocationFilterContextValue | null>(null);

interface OwnerLocationFilterProviderProps {
  children: React.ReactNode;
  users?: OwnerFilterOption[];
  locations?: CampaignOwnerLocations;
  plans?: string[];
}

function userMatchesFilters(
  user: OwnerFilterOption,
  ministryId: string,
  organizationId: string,
  province: string,
  city: string
): boolean {
  if (ministryId !== OWNER_MINISTRY_ALL && user.ministryId !== ministryId) return false;
  if (organizationId !== OWNER_ORGANIZATION_ALL && user.organizationId !== organizationId) {
    return false;
  }
  if (province !== OWNER_LOCATION_ALL && user.province !== province) return false;
  if (city !== OWNER_LOCATION_ALL && user.city !== city) return false;
  return true;
}

export function OwnerLocationFilterProvider({
  children,
  users = [],
  locations = { provinces: [], citiesByProvince: {}, ministries: [], organizations: [] },
  plans = [],
}: OwnerLocationFilterProviderProps) {
  const [filter, setFilter] = useState<OwnerLocationFilter>(DEFAULT_OWNER_LOCATION_FILTER);

  const provinces = useMemo(() => locations.provinces, [locations.provinces]);
  const ministries = useMemo(() => locations.ministries, [locations.ministries]);

  const organizations = useMemo(() => {
    if (filter.ministryId === OWNER_MINISTRY_ALL) return [];
    return locations.organizations.filter((org) => org.ministryId === filter.ministryId);
  }, [filter.ministryId, locations.organizations]);

  const cities = useMemo(() => {
    if (filter.province === OWNER_LOCATION_ALL) return [];
    return locations.citiesByProvince[filter.province] ?? [];
  }, [filter.province, locations.citiesByProvince]);

  const visibleUsers = useMemo(
    () =>
      users.filter((user) =>
        userMatchesFilters(
          user,
          filter.ministryId,
          filter.organizationId,
          filter.province,
          filter.city
        )
      ),
    [users, filter.ministryId, filter.organizationId, filter.province, filter.city]
  );

  const value = useMemo<OwnerLocationFilterContextValue>(
    () => ({
      filter,
      setMinistryId: (ministryId) =>
        setFilter((current) => {
          const nextUserKey =
            current.userKey !== OWNER_USER_ALL &&
            !users.some(
              (user) =>
                user.key === current.userKey &&
                userMatchesFilters(
                  user,
                  ministryId,
                  OWNER_ORGANIZATION_ALL,
                  current.province,
                  current.city
                )
            )
              ? OWNER_USER_ALL
              : current.userKey;

          return {
            ...current,
            ministryId,
            organizationId: OWNER_ORGANIZATION_ALL,
            userKey: nextUserKey,
          };
        }),
      setOrganizationId: (organizationId) =>
        setFilter((current) => {
          const nextUserKey =
            current.userKey !== OWNER_USER_ALL &&
            !users.some(
              (user) =>
                user.key === current.userKey &&
                userMatchesFilters(
                  user,
                  current.ministryId,
                  organizationId,
                  current.province,
                  current.city
                )
            )
              ? OWNER_USER_ALL
              : current.userKey;

          return { ...current, organizationId, userKey: nextUserKey };
        }),
      setProvince: (province) =>
        setFilter((current) => {
          const nextUserKey =
            current.userKey !== OWNER_USER_ALL &&
            !users.some(
              (user) =>
                user.key === current.userKey &&
                userMatchesFilters(
                  user,
                  current.ministryId,
                  current.organizationId,
                  province,
                  OWNER_LOCATION_ALL
                )
            )
              ? OWNER_USER_ALL
              : current.userKey;

          return {
            ...current,
            province,
            city: OWNER_LOCATION_ALL,
            userKey: nextUserKey,
          };
        }),
      setCity: (city) =>
        setFilter((current) => {
          const nextUserKey =
            current.userKey !== OWNER_USER_ALL &&
            !users.some(
              (user) =>
                user.key === current.userKey &&
                userMatchesFilters(
                  user,
                  current.ministryId,
                  current.organizationId,
                  current.province,
                  city
                )
            )
              ? OWNER_USER_ALL
              : current.userKey;

          return { ...current, city, userKey: nextUserKey };
        }),
      setUserKey: (userKey) => {
        if (userKey === OWNER_USER_ALL) {
          setFilter((current) => ({
            ...current,
            userKey: OWNER_USER_ALL,
            ministryId: OWNER_MINISTRY_ALL,
            organizationId: OWNER_ORGANIZATION_ALL,
            province: OWNER_LOCATION_ALL,
            city: OWNER_LOCATION_ALL,
          }));
          return;
        }

        const user = users.find((item) => item.key === userKey);
        setFilter((current) => ({
          ...current,
          userKey,
          ministryId: user?.ministryId?.trim() || current.ministryId,
          organizationId: user?.organizationId?.trim() || current.organizationId,
          province: user?.province?.trim() || current.province,
          city: user?.city?.trim() || current.city,
        }));
      },
      setDatePreset: (datePreset) => setFilter((current) => ({ ...current, datePreset })),
      setDateFrom: (dateFrom) => setFilter((current) => ({ ...current, dateFrom })),
      setDateTo: (dateTo) => setFilter((current) => ({ ...current, dateTo })),
      setSortOrder: (sortOrder) => setFilter((current) => ({ ...current, sortOrder })),
      setPlanLabels: (planLabels) => setFilter((current) => ({ ...current, planLabels })),
      togglePlanLabel: (planLabel) =>
        setFilter((current) => {
          const exists = current.planLabels.includes(planLabel);
          return {
            ...current,
            planLabels: exists
              ? current.planLabels.filter((label) => label !== planLabel)
              : [...current.planLabels, planLabel],
          };
        }),
      resetFilters: () => setFilter(DEFAULT_OWNER_LOCATION_FILTER),
      provinces,
      cities,
      ministries,
      organizations,
      plans,
      users: visibleUsers,
    }),
    [filter, provinces, cities, ministries, organizations, plans, visibleUsers, users]
  );

  return (
    <OwnerLocationFilterContext.Provider value={value}>
      {children}
    </OwnerLocationFilterContext.Provider>
  );
}

export function useOwnerLocationFilter(): OwnerLocationFilterContextValue {
  const context = useContext(OwnerLocationFilterContext);
  if (!context) {
    return {
      filter: DEFAULT_OWNER_LOCATION_FILTER,
      setMinistryId: () => undefined,
      setOrganizationId: () => undefined,
      setProvince: () => undefined,
      setCity: () => undefined,
      setUserKey: () => undefined,
      setDatePreset: () => undefined,
      setDateFrom: () => undefined,
      setDateTo: () => undefined,
      setSortOrder: () => undefined,
      setPlanLabels: () => undefined,
      togglePlanLabel: () => undefined,
      resetFilters: () => undefined,
      provinces: [],
      cities: [],
      ministries: [],
      organizations: [],
      plans: [],
      users: [],
    };
  }
  return context;
}

export function collectCampaignOwnerLocations(
  groups: DataOwnerGroup<Ownable>[]
): CampaignOwnerLocations {
  return collectOwnerLocations(groups);
}
