"use client";

import { useMemo } from "react";
import { Filter, Landmark, RotateCcw, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { Ownable } from "@/lib/types";
import { formatPlanLabelDisplay, matchesAnyPlanLabelFilter } from "@/lib/content-topics";

export const ADMIN_FILTER_ALL = "all";

export interface AdminContentFilterState {
  userKey: string;
  ministryId: string;
  organizationId: string;
  province: string;
  city: string;
  /** Empty array means all plan labels. */
  planLabels: string[];
}

export const DEFAULT_ADMIN_CONTENT_FILTER: AdminContentFilterState = {
  userKey: ADMIN_FILTER_ALL,
  ministryId: ADMIN_FILTER_ALL,
  organizationId: ADMIN_FILTER_ALL,
  province: ADMIN_FILTER_ALL,
  city: ADMIN_FILTER_ALL,
  planLabels: [],
};

export interface AdminFilterUserOption {
  key: string;
  label: string;
  ministryId?: string | null;
  organizationId?: string | null;
  province?: string | null;
  city?: string | null;
}

interface AdminContentFilterBarProps {
  filter: AdminContentFilterState;
  onChange: (next: AdminContentFilterState) => void;
  users: AdminFilterUserOption[];
  plans: string[];
  items?: Ownable[];
}

export function matchesAdminContentFilter<T extends Ownable>(
  item: T,
  filter: AdminContentFilterState
): boolean {
  if (filter.userKey !== ADMIN_FILTER_ALL) {
    const key = item.ownerUserId ?? item.ownerEmail ?? "";
    if (key !== filter.userKey) return false;
  }

  if (filter.ministryId !== ADMIN_FILTER_ALL) {
    if ((item.ownerMinistryId ?? "") !== filter.ministryId) return false;
  }

  if (filter.organizationId !== ADMIN_FILTER_ALL) {
    if ((item.ownerOrganizationId ?? "") !== filter.organizationId) return false;
  }

  if (filter.province !== ADMIN_FILTER_ALL) {
    if ((item.ownerProvince ?? "") !== filter.province) return false;
  }

  if (filter.city !== ADMIN_FILTER_ALL) {
    if ((item.ownerCity ?? "") !== filter.city) return false;
  }

  if (!matchesAnyPlanLabelFilter(item.planLabels, item.planLabel, filter.planLabels)) {
    return false;
  }

  return true;
}

export function collectAdminFilterUsers(items: Ownable[]): AdminFilterUserOption[] {
  const map = new Map<string, AdminFilterUserOption>();

  for (const item of items) {
    const key = item.ownerUserId ?? item.ownerEmail;
    if (!key) continue;
    const label = item.ownerName?.trim() || item.ownerEmail?.trim() || "کاربر";
    const existing = map.get(key);
    map.set(key, {
      key,
      label,
      ministryId: item.ownerMinistryId ?? existing?.ministryId ?? null,
      organizationId: item.ownerOrganizationId ?? existing?.organizationId ?? null,
      province: item.ownerProvince ?? existing?.province ?? null,
      city: item.ownerCity ?? existing?.city ?? null,
    });
  }

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "fa"));
}

function collectFromItems(items: Ownable[]) {
  const ministryMap = new Map<string, string>();
  const organizationMap = new Map<string, { id: string; name: string; ministryId: string }>();
  const provinceSet = new Set<string>();
  const citiesByProvince = new Map<string, Set<string>>();

  for (const item of items) {
    const ministryId = item.ownerMinistryId?.trim();
    if (ministryId) {
      ministryMap.set(ministryId, item.ownerMinistryName?.trim() || "وزارتخانه");
    }

    const organizationId = item.ownerOrganizationId?.trim();
    if (organizationId && ministryId) {
      organizationMap.set(organizationId, {
        id: organizationId,
        name: item.ownerOrganizationName?.trim() || "زیرمجموعه",
        ministryId,
      });
    }

    const province = item.ownerProvince?.trim();
    if (province) {
      provinceSet.add(province);
      if (!citiesByProvince.has(province)) citiesByProvince.set(province, new Set());
      const city = item.ownerCity?.trim();
      if (city) citiesByProvince.get(province)?.add(city);
    }
  }

  return {
    ministries: [...ministryMap.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "fa")),
    organizations: [...organizationMap.values()].sort((a, b) => a.name.localeCompare(b.name, "fa")),
    provinces: [...provinceSet].sort((a, b) => a.localeCompare(b, "fa")),
    citiesByProvince: Object.fromEntries(
      [...citiesByProvince.entries()].map(([province, cities]) => [
        province,
        [...cities].sort((a, b) => a.localeCompare(b, "fa")),
      ])
    ) as Record<string, string[]>,
  };
}

export function AdminContentFilterBar({
  filter,
  onChange,
  users,
  plans,
  items = [],
}: AdminContentFilterBarProps) {
  const meta = useMemo(() => collectFromItems(items), [items]);

  const visibleUsers = useMemo(
    () =>
      users.filter((user) => {
        if (filter.ministryId !== ADMIN_FILTER_ALL && user.ministryId !== filter.ministryId) {
          return false;
        }
        if (
          filter.organizationId !== ADMIN_FILTER_ALL &&
          user.organizationId !== filter.organizationId
        ) {
          return false;
        }
        if (filter.province !== ADMIN_FILTER_ALL && user.province !== filter.province) {
          return false;
        }
        if (filter.city !== ADMIN_FILTER_ALL && user.city !== filter.city) return false;
        return true;
      }),
    [users, filter.ministryId, filter.organizationId, filter.province, filter.city]
  );

  const organizationOptions = useMemo(() => {
    if (filter.ministryId === ADMIN_FILTER_ALL) return [];
    return meta.organizations.filter((org) => org.ministryId === filter.ministryId);
  }, [meta.organizations, filter.ministryId]);

  const cityOptions = useMemo(() => {
    if (filter.province === ADMIN_FILTER_ALL) return [];
    return meta.citiesByProvince[filter.province] ?? [];
  }, [meta.citiesByProvince, filter.province]);

  const active =
    filter.userKey !== ADMIN_FILTER_ALL ||
    filter.ministryId !== ADMIN_FILTER_ALL ||
    filter.organizationId !== ADMIN_FILTER_ALL ||
    filter.province !== ADMIN_FILTER_ALL ||
    filter.city !== ADMIN_FILTER_ALL ||
    filter.planLabels.length > 0;

  if (users.length === 0 && plans.length === 0 && meta.ministries.length === 0) return null;

  const togglePlan = (plan: string) => {
    const exists = filter.planLabels.includes(plan);
    onChange({
      ...filter,
      planLabels: exists
        ? filter.planLabels.filter((label) => label !== plan)
        : [...filter.planLabels, plan],
    });
  };

  const userOptions = [
    { value: ADMIN_FILTER_ALL, label: "همه کاربران" },
    ...visibleUsers.map((user) => ({ value: user.key, label: user.label })),
  ];

  const ministryOptions = [
    { value: ADMIN_FILTER_ALL, label: "همه وزارتخانه‌ها" },
    ...meta.ministries.map((ministry) => ({ value: ministry.id, label: ministry.name })),
  ];

  const orgSelectOptions = [
    { value: ADMIN_FILTER_ALL, label: "همه زیرمجموعه‌ها" },
    ...organizationOptions.map((org) => ({ value: org.id, label: org.name })),
  ];

  const provinceOptions = [
    { value: ADMIN_FILTER_ALL, label: "همه استان‌ها" },
    ...meta.provinces.map((province) => ({ value: province, label: province })),
  ];

  const citySelectOptions = [
    { value: ADMIN_FILTER_ALL, label: "همه شهرها" },
    ...cityOptions.map((city) => ({ value: city, label: city })),
  ];

  const planOptions = plans
    .filter((plan) => !filter.planLabels.includes(plan))
    .map((plan) => ({
      value: plan,
      label: formatPlanLabelDisplay(plan),
      keywords: plan,
    }));

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border bg-card/60 p-4 text-right" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4 text-primary" />
          فیلتر محتوا
        </div>

        {meta.ministries.length > 0 && (
          <SearchableSelect
            value={filter.ministryId}
            onValueChange={(ministryId) =>
              onChange({
                ...filter,
                ministryId,
                organizationId: ADMIN_FILTER_ALL,
                userKey: ADMIN_FILTER_ALL,
              })
            }
            options={ministryOptions}
            placeholder="وزارتخانه"
            searchPlaceholder="جستجوی وزارتخانه..."
            className="w-full sm:w-56"
            leadingIcon={<Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />}
          />
        )}

        {meta.ministries.length > 0 && (
          <SearchableSelect
            value={filter.organizationId}
            onValueChange={(organizationId) =>
              onChange({ ...filter, organizationId, userKey: ADMIN_FILTER_ALL })
            }
            options={orgSelectOptions}
            placeholder={
              filter.ministryId === ADMIN_FILTER_ALL
                ? "ابتدا وزارتخانه را انتخاب کنید"
                : "زیرمجموعه"
            }
            searchPlaceholder="جستجوی زیرمجموعه..."
            className="w-full sm:w-56"
            disabled={filter.ministryId === ADMIN_FILTER_ALL}
          />
        )}

        {users.length > 0 && (
          <SearchableSelect
            value={filter.userKey}
            onValueChange={(userKey) => onChange({ ...filter, userKey })}
            options={userOptions}
            placeholder="کاربر"
            searchPlaceholder="جستجوی کاربر..."
            className="w-full sm:w-64"
            leadingIcon={<UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />}
          />
        )}

        {meta.provinces.length > 0 && (
          <SearchableSelect
            value={filter.province}
            onValueChange={(province) =>
              onChange({
                ...filter,
                province,
                city: ADMIN_FILTER_ALL,
                userKey: ADMIN_FILTER_ALL,
              })
            }
            options={provinceOptions}
            placeholder="استان"
            searchPlaceholder="جستجوی استان..."
            className="w-full sm:w-48"
          />
        )}

        {meta.provinces.length > 0 && (
          <SearchableSelect
            value={filter.city}
            onValueChange={(city) => onChange({ ...filter, city, userKey: ADMIN_FILTER_ALL })}
            options={citySelectOptions}
            placeholder={
              filter.province === ADMIN_FILTER_ALL ? "ابتدا استان را انتخاب کنید" : "شهر"
            }
            searchPlaceholder="جستجوی شهر..."
            className="w-full sm:w-48"
            disabled={filter.province === ADMIN_FILTER_ALL}
          />
        )}

        {plans.length > 0 && (
          <SearchableSelect
            key={filter.planLabels.join("|")}
            value=""
            onValueChange={(value) => {
              if (!filter.planLabels.includes(value)) togglePlan(value);
            }}
            options={planOptions}
            placeholder="افزودن موضوع"
            searchPlaceholder="جستجوی موضوع..."
            className="w-full sm:w-56"
            clearAfterSelect
            emptyText="موضوعی برای افزودن نیست"
          />
        )}

        {active && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => onChange(DEFAULT_ADMIN_CONTENT_FILTER)}
          >
            <RotateCcw className="h-4 w-4" />
            ریست فیلتر
          </Button>
        )}
      </div>

      {filter.planLabels.length > 0 && (
        <div className="flex flex-wrap items-center justify-start gap-2">
          {filter.planLabels.map((label) => (
            <Badge key={label} variant="secondary" className="gap-1 pl-1">
              {formatPlanLabelDisplay(label)}
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-muted"
                onClick={() => togglePlan(label)}
                aria-label={`حذف ${label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
