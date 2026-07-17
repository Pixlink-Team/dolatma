import generated from "@/lib/site-updates.generated.json";

export interface SiteUpdateEntry {
  hash: string;
  committedAt: string;
  /** Persian title shown to admin/client users. */
  title: string;
  /** Original commit subject (kept for reference/debugging). */
  subject: string;
}

interface GeneratedSiteUpdates {
  entries: SiteUpdateEntry[];
}

export function getSiteUpdates(): SiteUpdateEntry[] {
  const data = generated as GeneratedSiteUpdates;
  if (!Array.isArray(data.entries)) return [];
  return [...data.entries].sort((a, b) => b.committedAt.localeCompare(a.committedAt));
}

/** Group updates by local calendar day (ISO date part of committedAt). */
export function groupSiteUpdatesByDay(
  entries: SiteUpdateEntry[]
): { day: string; items: SiteUpdateEntry[] }[] {
  const groups = new Map<string, SiteUpdateEntry[]>();
  for (const entry of entries) {
    const day = entry.committedAt.slice(0, 10);
    const bucket = groups.get(day);
    if (bucket) {
      bucket.push(entry);
    } else {
      groups.set(day, [entry]);
    }
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, items]) => ({ day, items }));
}
