"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProvinceCityFields } from "@/components/admin/province-city-fields";
import {
  CONTRACTOR_STATUS_LABELS,
  OWNERSHIP_KIND_LABELS,
  SOCIAL_PLATFORM_CAPACITY_LABELS,
  VENUE_KIND_LABELS,
  WEBSITE_APP_KIND_LABELS,
  emptyCapacityDetails,
  normalizeCapacityDetails,
  type CapacityDetails,
  type ContractorStatus,
  type OwnershipKind,
  type VenueKind,
  type WebsiteAppKind,
} from "@/lib/capacity-details";
import type { DeviceCapacityType, SocialPlatform } from "@/lib/types";

const NONE = "__none__";

interface CapacityDetailsFieldsProps {
  capacityType: DeviceCapacityType;
  details: CapacityDetails;
  province: string;
  city: string;
  address: string;
  onDetailsChange: (details: CapacityDetails) => void;
  onProvinceChange: (province: string) => void;
  onCityChange: (city: string) => void;
  onAddressChange: (address: string) => void;
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        min={0}
        inputMode="numeric"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(event) => {
          const raw = event.target.value;
          if (!raw.trim()) {
            onChange(null);
            return;
          }
          const num = Number(raw);
          onChange(Number.isFinite(num) && num >= 0 ? num : null);
        }}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function BoolField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function CapacityDetailsFields({
  capacityType,
  details,
  province,
  city,
  address,
  onDetailsChange,
  onProvinceChange,
  onCityChange,
  onAddressChange,
}: CapacityDetailsFieldsProps) {
  const typed = normalizeCapacityDetails(capacityType, details);

  const patch = (partial: Record<string, unknown>) => {
    onDetailsChange(
      normalizeCapacityDetails(capacityType, { ...typed, ...partial })
    );
  };

  const showLocation =
    capacityType === "venues" ||
    capacityType === "billboards" ||
    capacityType === "urban_tv" ||
    capacityType === "branches" ||
    capacityType === "call_center" ||
    capacityType === "other";

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-medium text-muted-foreground">
        مشخصات قابل گزارش‌گیری
      </p>

      {capacityType === "venues" && (
        <>
          <div className="space-y-1.5">
            <Label>نوع فضا</Label>
            <Select
              value={
                (typed as { venueKind?: VenueKind | null }).venueKind ?? NONE
              }
              onValueChange={(value) =>
                patch({
                  venueKind: value === NONE ? null : (value as VenueKind),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>انتخاب نشده</SelectItem>
                {(Object.keys(VENUE_KIND_LABELS) as VenueKind[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {VENUE_KIND_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label="ظرفیت نفر"
              value={(typed as { seatCapacity?: number | null }).seatCapacity}
              onChange={(value) => patch({ seatCapacity: value })}
              placeholder="مثلاً ۵۰۰"
            />
            <NumberField
              label="متراژ (مترمربع)"
              value={(typed as { areaSqm?: number | null }).areaSqm}
              onChange={(value) => patch({ areaSqm: value })}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <BoolField
              label="فضای سرپوشیده"
              checked={(typed as { indoor?: boolean | null }).indoor !== false}
              onChange={(checked) => patch({ indoor: checked })}
            />
            <BoolField
              label="سن / صحنه"
              checked={Boolean((typed as { hasStage?: boolean | null }).hasStage)}
              onChange={(checked) => patch({ hasStage: checked })}
            />
            <BoolField
              label="ویدیو پروژکتور"
              checked={Boolean(
                (typed as { hasProjector?: boolean | null }).hasProjector
              )}
              onChange={(checked) => patch({ hasProjector: checked })}
            />
            <BoolField
              label="سیستم صوت"
              checked={Boolean(
                (typed as { hasSoundSystem?: boolean | null }).hasSoundSystem
              )}
              onChange={(checked) => patch({ hasSoundSystem: checked })}
            />
          </div>
        </>
      )}

      {capacityType === "billboards" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="تعداد سازه"
            value={(typed as { structureCount?: number | null }).structureCount}
            onChange={(value) => patch({ structureCount: value })}
          />
          <NumberField
            label="جمع متراژ (مترمربع)"
            value={(typed as { totalAreaSqm?: number | null }).totalAreaSqm}
            onChange={(value) => patch({ totalAreaSqm: value })}
          />
          <div className="space-y-1.5 sm:col-span-2">
            <Label>نوع مالکیت</Label>
            <Select
              value={
                (typed as { ownership?: OwnershipKind | null }).ownership ?? NONE
              }
              onValueChange={(value) =>
                patch({
                  ownership: value === NONE ? null : (value as OwnershipKind),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>انتخاب نشده</SelectItem>
                {(Object.keys(OWNERSHIP_KIND_LABELS) as OwnershipKind[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {OWNERSHIP_KIND_LABELS[key]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {capacityType === "urban_tv" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="تعداد نمایشگر"
            value={(typed as { screenCount?: number | null }).screenCount}
            onChange={(value) => patch({ screenCount: value })}
          />
          <div className="space-y-1.5">
            <Label>نوع مالکیت</Label>
            <Select
              value={
                (typed as { ownership?: OwnershipKind | null }).ownership ?? NONE
              }
              onValueChange={(value) =>
                patch({
                  ownership: value === NONE ? null : (value as OwnershipKind),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>انتخاب نشده</SelectItem>
                {(Object.keys(OWNERSHIP_KIND_LABELS) as OwnershipKind[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {OWNERSHIP_KIND_LABELS[key]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {capacityType === "social" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>پلتفرم</Label>
            <Select
              value={
                (typed as { platform?: SocialPlatform | null }).platform ?? NONE
              }
              onValueChange={(value) =>
                patch({
                  platform: value === NONE ? null : (value as SocialPlatform),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>انتخاب نشده</SelectItem>
                {(
                  Object.keys(SOCIAL_PLATFORM_CAPACITY_LABELS) as SocialPlatform[]
                ).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SOCIAL_PLATFORM_CAPACITY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NumberField
            label="تعداد دنبال‌کننده"
            value={(typed as { followers?: number | null }).followers}
            onChange={(value) => patch({ followers: value })}
          />
          <div className="sm:col-span-2">
            <TextField
              label="آدرس / آیدی صفحه"
              value={(typed as { handleOrUrl?: string | null }).handleOrUrl}
              onChange={(value) => patch({ handleOrUrl: value })}
              placeholder="@example یا لینک"
            />
          </div>
        </div>
      )}

      {capacityType === "branches" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="تعداد شعبه"
            value={(typed as { branchCount?: number | null }).branchCount}
            onChange={(value) => patch({ branchCount: value })}
          />
          <NumberField
            label="تعداد نیرو"
            value={(typed as { staffCount?: number | null }).staffCount}
            onChange={(value) => patch({ staffCount: value })}
          />
        </div>
      )}

      {capacityType === "website_app" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>نوع</Label>
            <Select
              value={(typed as { kind?: WebsiteAppKind | null }).kind ?? NONE}
              onValueChange={(value) =>
                patch({
                  kind: value === NONE ? null : (value as WebsiteAppKind),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>انتخاب نشده</SelectItem>
                {(Object.keys(WEBSITE_APP_KIND_LABELS) as WebsiteAppKind[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {WEBSITE_APP_KIND_LABELS[key]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <NumberField
            label="بازدید ماهانه تقریبی"
            value={(typed as { monthlyVisitors?: number | null }).monthlyVisitors}
            onChange={(value) => patch({ monthlyVisitors: value })}
          />
          <div className="sm:col-span-2">
            <TextField
              label="آدرس"
              value={(typed as { url?: string | null }).url}
              onChange={(value) => patch({ url: value })}
              placeholder="https://"
            />
          </div>
        </div>
      )}

      {capacityType === "sms_panel" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="نام پنل / ارائه‌دهنده"
            value={(typed as { providerName?: string | null }).providerName}
            onChange={(value) => patch({ providerName: value })}
          />
          <NumberField
            label="ظرفیت پیامک روزانه"
            value={(typed as { dailySmsCapacity?: number | null }).dailySmsCapacity}
            onChange={(value) => patch({ dailySmsCapacity: value })}
          />
          <NumberField
            label="ظرفیت پیامک ماهانه"
            value={
              (typed as { monthlySmsCapacity?: number | null }).monthlySmsCapacity
            }
            onChange={(value) => patch({ monthlySmsCapacity: value })}
          />
        </div>
      )}

      {(capacityType === "pr_team" ||
        capacityType === "creative_team" ||
        capacityType === "field_staff") && (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="تعداد نفرات"
            value={(typed as { headcount?: number | null }).headcount}
            onChange={(value) => patch({ headcount: value })}
          />
          <TextField
            label="تخصص / توضیح کوتاه"
            value={(typed as { specialtyNote?: string | null }).specialtyNote}
            onChange={(value) => patch({ specialtyNote: value })}
          />
        </div>
      )}

      {capacityType === "call_center" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="تعداد اپراتور"
            value={(typed as { agentCount?: number | null }).agentCount}
            onChange={(value) => patch({ agentCount: value })}
          />
          <NumberField
            label="ظرفیت تماس روزانه"
            value={
              (typed as { dailyCallCapacity?: number | null }).dailyCallCapacity
            }
            onChange={(value) => patch({ dailyCallCapacity: value })}
          />
          <div className="sm:col-span-2">
            <TextField
              label="ساعات کاری"
              value={(typed as { workingHours?: string | null }).workingHours}
              onChange={(value) => patch({ workingHours: value })}
              placeholder="مثلاً ۸ تا ۱۶"
            />
          </div>
        </div>
      )}

      {capacityType === "contractors" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="حوزه تخصص"
            value={(typed as { specialty?: string | null }).specialty}
            onChange={(value) => patch({ specialty: value })}
          />
          <div className="space-y-1.5">
            <Label>وضعیت قرارداد</Label>
            <Select
              value={
                (typed as { status?: ContractorStatus | null }).status ?? NONE
              }
              onValueChange={(value) =>
                patch({
                  status: value === NONE ? null : (value as ContractorStatus),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>انتخاب نشده</SelectItem>
                {(
                  Object.keys(CONTRACTOR_STATUS_LABELS) as ContractorStatus[]
                ).map((key) => (
                  <SelectItem key={key} value={key}>
                    {CONTRACTOR_STATUS_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TextField
            label="تلفن تماس"
            value={(typed as { contactPhone?: string | null }).contactPhone}
            onChange={(value) => patch({ contactPhone: value })}
          />
        </div>
      )}

      {capacityType === "other" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="مقدار عددی"
            value={(typed as { quantity?: number | null }).quantity}
            onChange={(value) => patch({ quantity: value })}
          />
          <TextField
            label="واحد"
            value={(typed as { unitLabel?: string | null }).unitLabel}
            onChange={(value) => patch({ unitLabel: value })}
            placeholder="مثلاً دستگاه، نفر، عدد"
          />
        </div>
      )}

      {showLocation && (
        <div className="space-y-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            موقعیت این ظرفیت (برای گزارش مکانی)
          </p>
          <ProvinceCityFields
            province={province}
            city={city}
            onProvinceChange={onProvinceChange}
            onCityChange={onCityChange}
          />
          <TextField
            label="آدرس دقیق"
            value={address}
            onChange={onAddressChange}
            placeholder="خیابان، پلاک، نشان..."
          />
        </div>
      )}
    </div>
  );
}

export function resetDetailsForType(type: DeviceCapacityType): CapacityDetails {
  return emptyCapacityDetails(type);
}
