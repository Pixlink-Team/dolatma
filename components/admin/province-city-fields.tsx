"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  return (
    <div className={hideCity ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
      <div className="space-y-2">
        <Label>استان</Label>
        <Select
          value={provinceValue}
          onValueChange={(value) => {
            const nextProvince = value === EMPTY_VALUE ? "" : value;
            // Keep city empty until user picks one — do not auto-pick cities[0].
            const resolved = resolveLocationNames(nextProvince, "");
            onProvinceChange(resolved.province);
            onCityChange("");
            if (resolved.province) {
              onLocationCenterChange?.(getLocationCenter(resolved.province, ""));
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="انتخاب استان" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY_VALUE}>انتخاب نشده</SelectItem>
            {provinceOptions.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!hideCity && (
        <div className="space-y-2">
          <Label>شهر</Label>
          <Select
            value={cityValue}
            onValueChange={(value) => {
              const nextCity = value === EMPTY_VALUE ? "" : value;
              onCityChange(nextCity);
              if (province && nextCity) {
                onLocationCenterChange?.(getLocationCenter(province, nextCity));
              }
            }}
            disabled={!province}
          >
            <SelectTrigger>
              <SelectValue placeholder={province ? "انتخاب شهر" : "ابتدا استان را انتخاب کنید"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY_VALUE}>انتخاب نشده</SelectItem>
              {cityOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
