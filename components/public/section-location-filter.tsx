"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOwnerLocationFilter } from "@/lib/context/owner-location-filter-context";
import { OWNER_LOCATION_ALL } from "@/lib/owner-location-filter";

export function SectionLocationFilter() {
  const { filter, setProvince, setCity, provinces, cities } = useOwnerLocationFilter();

  return (
    <>
      <Select value={filter.province} onValueChange={setProvince}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="استان" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={OWNER_LOCATION_ALL}>همه استان‌ها</SelectItem>
          {provinces.map((province) => (
            <SelectItem key={province} value={province}>
              {province}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filter.city}
        onValueChange={setCity}
        disabled={filter.province === OWNER_LOCATION_ALL}
      >
        <SelectTrigger className="w-36">
          <SelectValue
            placeholder={
              filter.province === OWNER_LOCATION_ALL ? "ابتدا استان" : "شهر"
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={OWNER_LOCATION_ALL}>همه شهرها</SelectItem>
          {cities.map((city) => (
            <SelectItem key={city} value={city}>
              {city}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
