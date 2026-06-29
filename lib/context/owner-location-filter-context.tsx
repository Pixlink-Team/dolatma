"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { getCitiesForProvince, IRAN_PROVINCES } from "@/lib/iran-locations";
import {
  DEFAULT_OWNER_LOCATION_FILTER,
  OWNER_LOCATION_ALL,
  type OwnerLocationFilter,
} from "@/lib/owner-location-filter";

interface OwnerLocationFilterContextValue {
  filter: OwnerLocationFilter;
  setProvince: (province: string) => void;
  setCity: (city: string) => void;
  provinces: string[];
  cities: string[];
}

const OwnerLocationFilterContext = createContext<OwnerLocationFilterContextValue | null>(null);

interface OwnerLocationFilterProviderProps {
  children: React.ReactNode;
}

export function OwnerLocationFilterProvider({ children }: OwnerLocationFilterProviderProps) {
  const [filter, setFilter] = useState<OwnerLocationFilter>(DEFAULT_OWNER_LOCATION_FILTER);

  const provinces = useMemo(() => [...IRAN_PROVINCES], []);

  const cities = useMemo(
    () =>
      filter.province === OWNER_LOCATION_ALL ? [] : getCitiesForProvince(filter.province),
    [filter.province]
  );

  const value = useMemo<OwnerLocationFilterContextValue>(
    () => ({
      filter,
      setProvince: (province) => setFilter({ province, city: OWNER_LOCATION_ALL }),
      setCity: (city) => setFilter((current) => ({ ...current, city })),
      provinces,
      cities,
    }),
    [filter, provinces, cities]
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
      setProvince: () => undefined,
      setCity: () => undefined,
      provinces: [],
      cities: [],
    };
  }
  return context;
}
