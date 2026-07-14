"use client";

import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  ensureSelectOptions,
  IRAN_PROVINCES,
} from "@/lib/iran-locations";
import { getLocationCenter, getProvinceCityOptions, resolveLocationNames } from "@/lib/iran-location-center";

interface ProvinceCityFieldsProps {
  province: string;
  city: string;
  onProvinceChange: (province: string) => void;
  onCityChange: (city: string) => void;
  onLocationCenterChange?: (center: { lat: number; lng: number }) => void;
  /** When true, only province is shown (city kept empty). */
  hideCity?: boolean;
}

const EMPTY_VALUE = "__none__";

function resolveSelectValue(value: string | undefined | null, options: string[]): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return EMPTY_VALUE;
  return options.includes(trimmed) ? trimmed : trimmed;
}

export function ProvinceCityFields({
  province,
  city,
  onProvinceChange,
  onCityChange,
  onLocationCenterChange,
  hideCity = false,
}: ProvinceCityFieldsProps) {
  const provinceOptions = ensureSelectOptions([...IRAN_PROVINCES], province);
  const cityOptions = ensureSelectOptions(getProvinceCityOptions(province), city);
  const provinceValue = resolveSelectValue(province, provinceOptions);
  const cityValue = resolveSelectValue(city, cityOptions);

  const searchableProvinces = [
    { value: EMPTY_VALUE, label: "انتخاب نشده" },
    ...provinceOptions.map((item) => ({ value: item, label: item })),
  ];

  const searchableCities = [
    { value: EMPTY_VALUE, label: "انتخاب نشده" },
    ...cityOptions.map((item) => ({ value: item, label: item })),
  ];

  return (
    <div className={hideCity ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
      <div className="space-y-2">
        <Label>استان</Label>
        <SearchableSelect
          value={provinceValue}
          onValueChange={(value) => {
            const nextProvince = value === EMPTY_VALUE ? "" : value;
            const resolved = resolveLocationNames(nextProvince, "");
            onProvinceChange(resolved.province);
            onCityChange("");
            if (resolved.province) {
              onLocationCenterChange?.(getLocationCenter(resolved.province, ""));
            }
          }}
          options={searchableProvinces}
          placeholder="انتخاب استان"
          searchPlaceholder="جستجوی استان..."
        />
      </div>

      {!hideCity && (
        <div className="space-y-2">
          <Label>شهر</Label>
          <SearchableSelect
            value={cityValue}
            onValueChange={(value) => {
              const nextCity = value === EMPTY_VALUE ? "" : value;
              onCityChange(nextCity);
              if (province && nextCity) {
                onLocationCenterChange?.(getLocationCenter(province, nextCity));
              }
            }}
            options={searchableCities}
            placeholder={province ? "انتخاب شهر" : "ابتدا استان را انتخاب کنید"}
            searchPlaceholder="جستجوی شهر..."
            disabled={!province}
          />
        </div>
      )}
    </div>
  );
}
