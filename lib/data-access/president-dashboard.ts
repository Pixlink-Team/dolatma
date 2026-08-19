import { getAllCampaigns, getAdminData, getAllUsers } from "@/lib/data-access/admin";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { getLocationCenter } from "@/lib/iran-location-center";
import { isPostgresConfigured } from "@/lib/utils";

type ContentRecord = {
  campaignId: string;
  ownerUserId: string | null;
  ownerName: string | null;
  province: string | null;
  city: string | null;
  date: string | null;
  views: number;
  score: number;
};

type CityBucket = {
  province: string;
  city: string;
  uploads: number;
  views: number;
  score: number;
  uniqueOwners: Set<string>;
  activeCampaigns: Set<string>;
};

type OwnerBucket = {
  id: string;
  name: string;
  role: string;
  contentCount: number;
};

export interface PresidentDashboardKpis {
  activeCampaigns: number;
  totalUploads: number;
  totalViews: number;
  activeOwners: number;
  avgScore: number;
  completionRate: number;
}

export interface PresidentDashboardCitySummary {
  key: string;
  province: string;
  city: string;
  uploads: number;
  views: number;
  score: number;
  ownerCount: number;
  campaignCount: number;
  lat: number;
  lng: number;
}

export interface PresidentDashboardTimePoint {
  date: string;
  uploads: number;
  views: number;
}

export interface PresidentDashboardOwnerOption {
  id: string;
  name: string;
  role: string;
  contentCount: number;
}

export interface PresidentDashboardData {
  selectedOwnerId: string | null;
  canSwitchOwner: boolean;
  kpis: PresidentDashboardKpis;
  citySummaries: PresidentDashboardCitySummary[];
  timeseries: PresidentDashboardTimePoint[];
  ownerOptions: PresidentDashboardOwnerOption[];
}

function normalizeText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function pushRecords(
  target: ContentRecord[],
  campaignId: string,
  rows: Array<Record<string, unknown>> | undefined,
  options?: {
    provinceField?: string;
    cityField?: string;
    viewsField?: string;
    dateField?: string;
  }
) {
  if (!rows?.length) return;
  const provinceField = options?.provinceField ?? "ownerProvince";
  const cityField = options?.cityField ?? "ownerCity";
  const viewsField = options?.viewsField ?? "views";
  const dateField = options?.dateField ?? "createdAt";

  for (const row of rows) {
    const province = normalizeText((row[provinceField] as string | null) ?? null);
    const city = normalizeText((row[cityField] as string | null) ?? null);
    if (!province || !city) continue;
    const ownerUserId = normalizeText((row.ownerUserId as string | null) ?? null);
    const ownerName = normalizeText((row.ownerName as string | null) ?? null);
    const date = normalizeDate((row[dateField] as string | null) ?? (row.updatedAt as string | null) ?? null);
    const views = toNumber(row[viewsField]);
    const score = toNumber(row.score);
    target.push({
      campaignId,
      ownerUserId,
      ownerName,
      province,
      city,
      date,
      views,
      score,
    });
  }
}

function applyDateRange(
  records: ContentRecord[],
  dateRange: "all" | "30d" | "90d"
): ContentRecord[] {
  if (dateRange === "all") return records;
  const days = dateRange === "30d" ? 30 : 90;
  const minTs = Date.now() - days * 24 * 60 * 60 * 1000;
  return records.filter((row) => {
    if (!row.date) return false;
    const ts = new Date(row.date).getTime();
    return Number.isFinite(ts) && ts >= minTs;
  });
}

export async function getPresidentDashboardData(input?: {
  ownerId?: string | null;
  dateRange?: "all" | "30d" | "90d";
}): Promise<PresidentDashboardData> {
  const session = await getAuthSession();
  const dateRange = input?.dateRange ?? "30d";
  const canSwitchOwner = Boolean(session && isFullAdmin(session));
  const selectedOwnerId = canSwitchOwner ? normalizeText(input?.ownerId) : null;

  const campaigns = await getAllCampaigns();
  const campaignData = await Promise.all(
    campaigns.map(async (campaign) => ({
      campaign,
      data: await getAdminData(campaign.id),
    }))
  );

  const records: ContentRecord[] = [];
  const ownerBuckets = new Map<string, OwnerBucket>();
  let totalSubmissions = 0;
  let approvedSubmissions = 0;

  for (const { campaign, data } of campaignData) {
    pushRecords(records, campaign.id, data.billboards as Array<Record<string, unknown>> | undefined, {
      provinceField: "province",
      cityField: "city",
      dateField: "updatedAt",
    });
    pushRecords(records, campaign.id, data.posters as Array<Record<string, unknown>> | undefined);
    pushRecords(records, campaign.id, data.videos as Array<Record<string, unknown>> | undefined);
    pushRecords(records, campaign.id, data.files as Array<Record<string, unknown>> | undefined);
    pushRecords(records, campaign.id, data.rawMedia as Array<Record<string, unknown>> | undefined);
    pushRecords(records, campaign.id, data.socialPosts as Array<Record<string, unknown>> | undefined, {
      viewsField: "views",
      dateField: "publishedDate",
    });
    pushRecords(records, campaign.id, data.activities as Array<Record<string, unknown>> | undefined, {
      dateField: "activityDate",
    });
    pushRecords(records, campaign.id, data.broadcastReports as Array<Record<string, unknown>> | undefined, {
      dateField: "reportDate",
    });
    pushRecords(records, campaign.id, data.meetings as Array<Record<string, unknown>> | undefined, {
      dateField: "meetingDate",
    });

    const submissions = (data.submissions as Array<Record<string, unknown>> | undefined) ?? [];
    totalSubmissions += submissions.length;
    approvedSubmissions += submissions.filter((item) => item.status === "approved").length;

    const ownerRows = [
      ...(data.billboards ?? []),
      ...(data.posters ?? []),
      ...(data.videos ?? []),
      ...(data.files ?? []),
      ...(data.rawMedia ?? []),
      ...(data.socialPosts ?? []),
      ...(data.activities ?? []),
      ...(data.broadcastReports ?? []),
      ...(data.meetings ?? []),
    ] as Array<Record<string, unknown>>;
    for (const row of ownerRows) {
      const ownerId = normalizeText((row.ownerUserId as string | null) ?? null);
      if (!ownerId) continue;
      const key = ownerId;
      const current = ownerBuckets.get(key);
      if (current) {
        current.contentCount += 1;
      } else {
        ownerBuckets.set(key, {
          id: ownerId,
          name: normalizeText((row.ownerName as string | null) ?? null) ?? "کاربر بدون نام",
          role: "org_user",
          contentCount: 1,
        });
      }
    }
  }

  if (canSwitchOwner && isPostgresConfigured()) {
    const users = await getAllUsers();
    for (const user of users) {
      if (user.role !== "client" && user.role !== "org_user") continue;
      const existing = ownerBuckets.get(user.id);
      ownerBuckets.set(user.id, {
        id: user.id,
        name: user.name || user.email,
        role: user.role,
        contentCount: existing?.contentCount ?? 0,
      });
    }
  }

  const filteredByOwner =
    selectedOwnerId && canSwitchOwner
      ? records.filter((row) => row.ownerUserId === selectedOwnerId)
      : records;
  const filteredRecords = applyDateRange(filteredByOwner, dateRange);

  const cities = new Map<string, CityBucket>();
  const series = new Map<string, { uploads: number; views: number }>();
  const activeCampaigns = new Set<string>();
  const ownerIds = new Set<string>();
  let totalViews = 0;
  let totalScore = 0;

  for (const row of filteredRecords) {
    const key = `${row.province}::${row.city}`;
    const current =
      cities.get(key) ??
      {
        province: row.province ?? "",
        city: row.city ?? "",
        uploads: 0,
        views: 0,
        score: 0,
        uniqueOwners: new Set<string>(),
        activeCampaigns: new Set<string>(),
      };

    current.uploads += 1;
    current.views += row.views;
    current.score += row.score;
    if (row.ownerUserId) current.uniqueOwners.add(row.ownerUserId);
    current.activeCampaigns.add(row.campaignId);
    cities.set(key, current);

    if (row.date) {
      const point = series.get(row.date) ?? { uploads: 0, views: 0 };
      point.uploads += 1;
      point.views += row.views;
      series.set(row.date, point);
    }

    activeCampaigns.add(row.campaignId);
    if (row.ownerUserId) ownerIds.add(row.ownerUserId);
    totalViews += row.views;
    totalScore += row.score;
  }

  const citySummaries: PresidentDashboardCitySummary[] = [...cities.entries()]
    .map(([key, bucket]) => {
      const center = getLocationCenter(bucket.province, bucket.city);
      return {
        key,
        province: bucket.province,
        city: bucket.city,
        uploads: bucket.uploads,
        views: bucket.views,
        score: bucket.score,
        ownerCount: bucket.uniqueOwners.size,
        campaignCount: bucket.activeCampaigns.size,
        lat: center.lat,
        lng: center.lng,
      };
    })
    .sort((a, b) => b.uploads - a.uploads || b.views - a.views);

  const timeseries: PresidentDashboardTimePoint[] = [...series.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, uploads: value.uploads, views: value.views }));

  const ownerOptions: PresidentDashboardOwnerOption[] = [...ownerBuckets.values()]
    .sort((a, b) => b.contentCount - a.contentCount || a.name.localeCompare(b.name))
    .map((item) => ({
      id: item.id,
      name: item.name,
      role: item.role,
      contentCount: item.contentCount,
    }));

  const completionRate =
    totalSubmissions > 0 ? Math.round((approvedSubmissions / totalSubmissions) * 100) : 0;
  const avgScore = filteredRecords.length > 0 ? Math.round(totalScore / filteredRecords.length) : 0;

  return {
    selectedOwnerId,
    canSwitchOwner,
    kpis: {
      activeCampaigns: activeCampaigns.size,
      totalUploads: filteredRecords.length,
      totalViews,
      activeOwners: ownerIds.size,
      avgScore,
      completionRate,
    },
    citySummaries,
    timeseries,
    ownerOptions,
  };
}
