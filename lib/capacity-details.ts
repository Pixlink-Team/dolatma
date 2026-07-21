import type { DeviceCapacityType, SocialPlatform } from "@/lib/types";
import { formatPersianNumber } from "@/lib/utils";

/** Physical venue / hall / public space. */
export type VenueKind =
  | "hall"
  | "school"
  | "mosque"
  | "university"
  | "park"
  | "conference"
  | "outdoor"
  | "other";

export type WebsiteAppKind = "website" | "app" | "both";
export type OwnershipKind = "owned" | "rented" | "shared" | "municipal" | "other";
export type ContractorStatus = "active" | "standby" | "expired";

export interface CapacityLocationFields {
  province?: string | null;
  city?: string | null;
  address?: string | null;
}

export interface BranchesCapacityDetails {
  branchCount?: number | null;
  staffCount?: number | null;
}

export interface WebsiteAppCapacityDetails {
  kind?: WebsiteAppKind | null;
  url?: string | null;
  monthlyVisitors?: number | null;
}

export interface SocialCapacityDetails {
  platform?: SocialPlatform | null;
  handleOrUrl?: string | null;
  followers?: number | null;
}

export interface SmsPanelCapacityDetails {
  providerName?: string | null;
  dailySmsCapacity?: number | null;
  monthlySmsCapacity?: number | null;
}

export interface BillboardsCapacityDetails {
  structureCount?: number | null;
  totalAreaSqm?: number | null;
  ownership?: OwnershipKind | null;
}

export interface UrbanTvCapacityDetails {
  screenCount?: number | null;
  ownership?: OwnershipKind | null;
}

export interface VenuesCapacityDetails {
  venueKind?: VenueKind | null;
  seatCapacity?: number | null;
  areaSqm?: number | null;
  hasStage?: boolean | null;
  hasProjector?: boolean | null;
  hasSoundSystem?: boolean | null;
  indoor?: boolean | null;
}

export interface TeamCapacityDetails {
  headcount?: number | null;
  specialtyNote?: string | null;
}

export interface CallCenterCapacityDetails {
  agentCount?: number | null;
  dailyCallCapacity?: number | null;
  workingHours?: string | null;
}

export interface ContractorsCapacityDetails {
  specialty?: string | null;
  status?: ContractorStatus | null;
  contactPhone?: string | null;
}

export interface OtherCapacityDetails {
  quantity?: number | null;
  unitLabel?: string | null;
}

export type CapacityDetailsByType = {
  branches: BranchesCapacityDetails;
  website_app: WebsiteAppCapacityDetails;
  social: SocialCapacityDetails;
  sms_panel: SmsPanelCapacityDetails;
  billboards: BillboardsCapacityDetails;
  urban_tv: UrbanTvCapacityDetails;
  venues: VenuesCapacityDetails;
  pr_team: TeamCapacityDetails;
  creative_team: TeamCapacityDetails;
  field_staff: TeamCapacityDetails;
  call_center: CallCenterCapacityDetails;
  contractors: ContractorsCapacityDetails;
  other: OtherCapacityDetails;
};

export type CapacityDetails = CapacityDetailsByType[DeviceCapacityType];

export const VENUE_KIND_LABELS: Record<VenueKind, string> = {
  hall: "سالن اجتماعات",
  school: "مدرسه",
  mosque: "مسجد / حسینیه",
  university: "دانشگاه / مرکز علمی",
  park: "پارک / فضای باز",
  conference: "سالن همایش",
  outdoor: "فضای روباز",
  other: "سایر",
};

export const WEBSITE_APP_KIND_LABELS: Record<WebsiteAppKind, string> = {
  website: "وب‌سایت",
  app: "اپلیکیشن",
  both: "وب‌سایت و اپلیکیشن",
};

export const OWNERSHIP_KIND_LABELS: Record<OwnershipKind, string> = {
  owned: "ملکی",
  rented: "اجاره‌ای",
  shared: "مشترک",
  municipal: "شهرداری / عمومی",
  other: "سایر",
};

export const CONTRACTOR_STATUS_LABELS: Record<ContractorStatus, string> = {
  active: "فعال",
  standby: "آماده به‌کار",
  expired: "منقضی",
};

export const SOCIAL_PLATFORM_CAPACITY_LABELS: Record<SocialPlatform, string> = {
  instagram: "اینستاگرام",
  x: "ایکس (توییتر)",
  telegram: "تلگرام",
  linkedin: "لینکدین",
  youtube: "یوتیوب",
  aparat: "آپارات",
  rubika: "روبیکا",
  eitaa: "ایتا",
  soroush: "سروش",
  bale: "بله",
  other: "سایر",
};

const VENUE_KINDS = Object.keys(VENUE_KIND_LABELS) as VenueKind[];
const WEBSITE_KINDS = Object.keys(WEBSITE_APP_KIND_LABELS) as WebsiteAppKind[];
const OWNERSHIP_KINDS = Object.keys(OWNERSHIP_KIND_LABELS) as OwnershipKind[];
const CONTRACTOR_STATUSES = Object.keys(CONTRACTOR_STATUS_LABELS) as ContractorStatus[];
const SOCIAL_PLATFORMS = Object.keys(SOCIAL_PLATFORM_CAPACITY_LABELS) as SocialPlatform[];

function asOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function asOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
}

function asOptionalBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  if (typeof value !== "string") return null;
  return allowed.includes(value as T) ? (value as T) : null;
}

/** Empty details object for a given capacity type. */
export function emptyCapacityDetails(type: DeviceCapacityType): CapacityDetails {
  switch (type) {
    case "branches":
      return { branchCount: null, staffCount: null };
    case "website_app":
      return { kind: null, url: null, monthlyVisitors: null };
    case "social":
      return { platform: null, handleOrUrl: null, followers: null };
    case "sms_panel":
      return { providerName: null, dailySmsCapacity: null, monthlySmsCapacity: null };
    case "billboards":
      return { structureCount: null, totalAreaSqm: null, ownership: null };
    case "urban_tv":
      return { screenCount: null, ownership: null };
    case "venues":
      return {
        venueKind: null,
        seatCapacity: null,
        areaSqm: null,
        hasStage: null,
        hasProjector: null,
        hasSoundSystem: null,
        indoor: true,
      };
    case "pr_team":
    case "creative_team":
    case "field_staff":
      return { headcount: null, specialtyNote: null };
    case "call_center":
      return { agentCount: null, dailyCallCapacity: null, workingHours: null };
    case "contractors":
      return { specialty: null, status: null, contactPhone: null };
    default:
      return { quantity: null, unitLabel: null };
  }
}

/** Normalize unknown JSON into a typed details object for the given capacity type. */
export function normalizeCapacityDetails(
  type: DeviceCapacityType,
  raw: unknown
): CapacityDetails {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  switch (type) {
    case "branches":
      return {
        branchCount: asOptionalNumber(source.branchCount),
        staffCount: asOptionalNumber(source.staffCount),
      };
    case "website_app":
      return {
        kind: asEnum(source.kind, WEBSITE_KINDS),
        url: asOptionalString(source.url),
        monthlyVisitors: asOptionalNumber(source.monthlyVisitors),
      };
    case "social":
      return {
        platform: asEnum(source.platform, SOCIAL_PLATFORMS),
        handleOrUrl: asOptionalString(source.handleOrUrl),
        followers: asOptionalNumber(source.followers),
      };
    case "sms_panel":
      return {
        providerName: asOptionalString(source.providerName),
        dailySmsCapacity: asOptionalNumber(source.dailySmsCapacity),
        monthlySmsCapacity: asOptionalNumber(source.monthlySmsCapacity),
      };
    case "billboards":
      return {
        structureCount: asOptionalNumber(source.structureCount),
        totalAreaSqm: asOptionalNumber(source.totalAreaSqm),
        ownership: asEnum(source.ownership, OWNERSHIP_KINDS),
      };
    case "urban_tv":
      return {
        screenCount: asOptionalNumber(source.screenCount),
        ownership: asEnum(source.ownership, OWNERSHIP_KINDS),
      };
    case "venues":
      return {
        venueKind: asEnum(source.venueKind, VENUE_KINDS),
        seatCapacity: asOptionalNumber(source.seatCapacity),
        areaSqm: asOptionalNumber(source.areaSqm),
        hasStage: asOptionalBoolean(source.hasStage),
        hasProjector: asOptionalBoolean(source.hasProjector),
        hasSoundSystem: asOptionalBoolean(source.hasSoundSystem),
        indoor: asOptionalBoolean(source.indoor) ?? true,
      };
    case "pr_team":
    case "creative_team":
    case "field_staff":
      return {
        headcount: asOptionalNumber(source.headcount),
        specialtyNote: asOptionalString(source.specialtyNote),
      };
    case "call_center":
      return {
        agentCount: asOptionalNumber(source.agentCount),
        dailyCallCapacity: asOptionalNumber(source.dailyCallCapacity),
        workingHours: asOptionalString(source.workingHours),
      };
    case "contractors":
      return {
        specialty: asOptionalString(source.specialty),
        status: asEnum(source.status, CONTRACTOR_STATUSES),
        contactPhone: asOptionalString(source.contactPhone),
      };
    default:
      return {
        quantity: asOptionalNumber(source.quantity),
        unitLabel: asOptionalString(source.unitLabel),
      };
  }
}

/**
 * Primary quantitative metric used for national rollups / KPI cards.
 * Returns null when the type has no numeric primary metric filled.
 */
export function getCapacityPrimaryMetric(
  type: DeviceCapacityType,
  details: CapacityDetails
): { value: number; unitLabel: string } | null {
  switch (type) {
    case "branches": {
      const d = details as BranchesCapacityDetails;
      if (d.branchCount != null) return { value: d.branchCount, unitLabel: "شعبه" };
      return null;
    }
    case "website_app": {
      const d = details as WebsiteAppCapacityDetails;
      if (d.monthlyVisitors != null) {
        return { value: d.monthlyVisitors, unitLabel: "بازدید ماهانه" };
      }
      return null;
    }
    case "social": {
      const d = details as SocialCapacityDetails;
      if (d.followers != null) return { value: d.followers, unitLabel: "دنبال‌کننده" };
      return null;
    }
    case "sms_panel": {
      const d = details as SmsPanelCapacityDetails;
      if (d.dailySmsCapacity != null) {
        return { value: d.dailySmsCapacity, unitLabel: "پیامک روزانه" };
      }
      if (d.monthlySmsCapacity != null) {
        return { value: d.monthlySmsCapacity, unitLabel: "پیامک ماهانه" };
      }
      return null;
    }
    case "billboards": {
      const d = details as BillboardsCapacityDetails;
      if (d.structureCount != null) return { value: d.structureCount, unitLabel: "سازه" };
      return null;
    }
    case "urban_tv": {
      const d = details as UrbanTvCapacityDetails;
      if (d.screenCount != null) return { value: d.screenCount, unitLabel: "نمایشگر" };
      return null;
    }
    case "venues": {
      const d = details as VenuesCapacityDetails;
      if (d.seatCapacity != null) return { value: d.seatCapacity, unitLabel: "نفر ظرفیت" };
      return null;
    }
    case "pr_team":
    case "creative_team":
    case "field_staff": {
      const d = details as TeamCapacityDetails;
      if (d.headcount != null) return { value: d.headcount, unitLabel: "نفر" };
      return null;
    }
    case "call_center": {
      const d = details as CallCenterCapacityDetails;
      if (d.agentCount != null) return { value: d.agentCount, unitLabel: "اپراتور" };
      return null;
    }
    case "other": {
      const d = details as OtherCapacityDetails;
      if (d.quantity != null) {
        return { value: d.quantity, unitLabel: d.unitLabel?.trim() || "واحد" };
      }
      return null;
    }
    default:
      return null;
  }
}

/** Short Persian summary line for lists and map table. */
export function formatCapacityDetailsSummary(
  type: DeviceCapacityType,
  details: CapacityDetails,
  location?: CapacityLocationFields | null
): string {
  const parts: string[] = [];

  switch (type) {
    case "venues": {
      const d = details as VenuesCapacityDetails;
      if (d.venueKind) parts.push(VENUE_KIND_LABELS[d.venueKind]);
      if (d.seatCapacity != null) {
        parts.push(`ظرفیت ${formatPersianNumber(d.seatCapacity)} نفر`);
      }
      if (d.areaSqm != null) parts.push(`${formatPersianNumber(d.areaSqm)} مترمربع`);
      const amenities: string[] = [];
      if (d.hasStage) amenities.push("سن");
      if (d.hasProjector) amenities.push("ویدیو پروژکتور");
      if (d.hasSoundSystem) amenities.push("سیستم صوت");
      if (amenities.length) parts.push(amenities.join("، "));
      if (d.indoor === false) parts.push("فضای باز");
      break;
    }
    case "billboards": {
      const d = details as BillboardsCapacityDetails;
      if (d.structureCount != null) {
        parts.push(`${formatPersianNumber(d.structureCount)} سازه`);
      }
      if (d.totalAreaSqm != null) {
        parts.push(`${formatPersianNumber(d.totalAreaSqm)} مترمربع`);
      }
      if (d.ownership) parts.push(OWNERSHIP_KIND_LABELS[d.ownership]);
      break;
    }
    case "urban_tv": {
      const d = details as UrbanTvCapacityDetails;
      if (d.screenCount != null) {
        parts.push(`${formatPersianNumber(d.screenCount)} نمایشگر`);
      }
      if (d.ownership) parts.push(OWNERSHIP_KIND_LABELS[d.ownership]);
      break;
    }
    case "social": {
      const d = details as SocialCapacityDetails;
      if (d.platform) parts.push(SOCIAL_PLATFORM_CAPACITY_LABELS[d.platform]);
      if (d.followers != null) {
        parts.push(`${formatPersianNumber(d.followers)} دنبال‌کننده`);
      }
      break;
    }
    case "branches": {
      const d = details as BranchesCapacityDetails;
      if (d.branchCount != null) parts.push(`${formatPersianNumber(d.branchCount)} شعبه`);
      if (d.staffCount != null) parts.push(`${formatPersianNumber(d.staffCount)} نیرو`);
      break;
    }
    case "website_app": {
      const d = details as WebsiteAppCapacityDetails;
      if (d.kind) parts.push(WEBSITE_APP_KIND_LABELS[d.kind]);
      if (d.monthlyVisitors != null) {
        parts.push(`${formatPersianNumber(d.monthlyVisitors)} بازدید ماهانه`);
      }
      break;
    }
    case "sms_panel": {
      const d = details as SmsPanelCapacityDetails;
      if (d.providerName) parts.push(d.providerName);
      if (d.dailySmsCapacity != null) {
        parts.push(`${formatPersianNumber(d.dailySmsCapacity)} پیامک/روز`);
      }
      break;
    }
    case "pr_team":
    case "creative_team":
    case "field_staff": {
      const d = details as TeamCapacityDetails;
      if (d.headcount != null) parts.push(`${formatPersianNumber(d.headcount)} نفر`);
      if (d.specialtyNote) parts.push(d.specialtyNote);
      break;
    }
    case "call_center": {
      const d = details as CallCenterCapacityDetails;
      if (d.agentCount != null) {
        parts.push(`${formatPersianNumber(d.agentCount)} اپراتور`);
      }
      if (d.dailyCallCapacity != null) {
        parts.push(`${formatPersianNumber(d.dailyCallCapacity)} تماس/روز`);
      }
      if (d.workingHours) parts.push(d.workingHours);
      break;
    }
    case "contractors": {
      const d = details as ContractorsCapacityDetails;
      if (d.specialty) parts.push(d.specialty);
      if (d.status) parts.push(CONTRACTOR_STATUS_LABELS[d.status]);
      break;
    }
    default: {
      const d = details as OtherCapacityDetails;
      if (d.quantity != null) {
        parts.push(
          `${formatPersianNumber(d.quantity)}${d.unitLabel ? ` ${d.unitLabel}` : ""}`
        );
      }
      break;
    }
  }

  const locationBits = [location?.province, location?.city].filter(Boolean);
  if (locationBits.length) parts.push(locationBits.join(" / "));

  return parts.join(" · ");
}
