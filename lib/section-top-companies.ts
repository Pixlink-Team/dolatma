import type { UserContentScoreItem } from "@/lib/city-leaderboard";
import type {
  Billboard,
  CampaignActivity,
  DataOwnerGroup,
  Ownable,
  SocialMediaPost,
} from "@/lib/types";

/** Ranking row for a device/subtree (وزارتخانه، سازمان، اداره…), not an individual user. */
export interface SectionTopCompany {
  key: string;
  name: string;
  count: number;
  scoreTotal: number;
  scoreAvg: number;
}

export type SectionTopSort = "count" | "score";

/** Content types a `SectionTopCompaniesBox` can be rendering a ranking for. */
export type SectionContentKind =
  | "billboard"
  | "poster"
  | "video"
  | "social_post"
  | "site_publication"
  | "activity"
  | "file"
  | "raw_media"
  | "broadcast";

export const SECTION_CONTENT_KIND_LABEL: Record<SectionContentKind, string> = {
  billboard: "تبلیغات محیطی",
  poster: "پوستر و عکس",
  video: "ویدیو",
  social_post: "شبکه اجتماعی",
  site_publication: "انتشار سایت",
  activity: "اقدام",
  file: "فایل",
  raw_media: "راش تصاویر",
  broadcast: "گزارش پخش",
};

/**
 * Rank by organization first, then ministry, and only fall back to the
 * individual contributor when no device/subtree is on record for the item.
 */
function resolveDeviceKey(item: Ownable): { key: string; name: string } {
  const organizationId = item.ownerOrganizationId?.trim();
  const organizationName = item.ownerOrganizationName?.trim();
  if (organizationId && organizationName) {
    return { key: organizationId, name: organizationName };
  }

  const ministryId = item.ownerMinistryId?.trim();
  const ministryName = item.ownerMinistryName?.trim();
  if (ministryId && ministryName) {
    return { key: ministryId, name: ministryName };
  }

  const name = item.ownerName?.trim() || "دستگاه";
  const key = item.ownerUserId ?? item.ownerEmail ?? name;
  return { key, name };
}

export function buildSectionTopCompanies(
  groups: DataOwnerGroup<Ownable>[],
  sort: SectionTopSort = "count",
  limit = 5
): SectionTopCompany[] {
  const map = new Map<string, SectionTopCompany>();

  for (const group of groups) {
    for (const item of group.items) {
      const { key, name } = resolveDeviceKey(item);
      const current = map.get(key) ?? {
        key,
        name,
        count: 0,
        scoreTotal: 0,
        scoreAvg: 0,
      };
      current.count += 1;
      if (typeof item.score === "number" && Number.isFinite(item.score)) {
        current.scoreTotal += item.score;
      }
      map.set(key, current);
    }
  }

  const rows = [...map.values()].map((row) => ({
    ...row,
    scoreAvg: row.count > 0 ? row.scoreTotal / row.count : 0,
  }));

  rows.sort((a, b) => {
    if (sort === "score") {
      return b.scoreTotal - a.scoreTotal || b.count - a.count || a.name.localeCompare(b.name, "fa");
    }
    return b.count - a.count || b.scoreTotal - a.scoreTotal || a.name.localeCompare(b.name, "fa");
  });

  return rows.slice(0, limit);
}

/** Items belonging to a single device/org ranking row (`SectionTopCompany.key`). */
export function collectCompanyItemsFromGroups<T extends Ownable>(
  groups: DataOwnerGroup<T>[],
  companyKey: string
): T[] {
  const items: T[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      if (resolveDeviceKey(item).key === companyKey) {
        items.push(item);
      }
    }
  }
  return items;
}

function resolveThumbnailForKind(
  kind: SectionContentKind,
  item: Ownable & { id: string; title: string }
): string | null {
  switch (kind) {
    case "billboard":
      return (item as unknown as Billboard).thumbnailUrl ?? null;
    case "social_post":
    case "site_publication":
      return (item as unknown as SocialMediaPost).coverImageUrl ?? null;
    case "activity":
      return (item as unknown as CampaignActivity).imageUrl ?? null;
    default:
      return null;
  }
}

/** Map items of a single content kind into the shape `UserContentScoreModal` expects. */
export function mapSectionItemsToContentScoreItems(
  kind: SectionContentKind,
  items: Ownable[]
): UserContentScoreItem[] {
  return (items as Array<Ownable & { id: string; title: string }>).map((item) => ({
    id: item.id,
    title: item.title,
    typeLabel: SECTION_CONTENT_KIND_LABEL[kind],
    contentType: kind,
    thumbnailUrl: resolveThumbnailForKind(kind, item),
    score: typeof item.score === "number" ? item.score : null,
  }));
}
