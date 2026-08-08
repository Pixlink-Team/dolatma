import type { TimelineEvent } from "@taghvim/types/timeline";

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** Normalize Persian/Arabic text for comparison */
export function normalizeEnemyText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeEnemyText(text)
      .split(" ")
      .filter((t) => t.length > 2),
  );
}

/** True when two titles likely describe the same enemy action */
export function titlesAreSimilar(a: string, b: string): boolean {
  const na = normalizeEnemyText(a);
  const nb = normalizeEnemyText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (ta.size === 0 || tb.size === 0) return false;

  let intersection = 0;
  for (const token of ta) {
    if (tb.has(token)) intersection += 1;
  }
  const union = ta.size + tb.size - intersection;
  return union > 0 && intersection / union >= 0.55;
}

function locationsCompatible(a: TimelineEvent, b: TimelineEvent): boolean {
  const la = normalizeEnemyText(
    a.location?.city || a.location?.province || "",
  );
  const lb = normalizeEnemyText(
    b.location?.city || b.location?.province || "",
  );
  if (!la || !lb) return true;
  return la === lb || la.includes(lb) || lb.includes(la);
}

function pickPrimary(events: TimelineEvent[]): TimelineEvent {
  return [...events].sort((a, b) => {
    const severity =
      (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
    if (severity !== 0) return severity;
    return a.createdAt.localeCompare(b.createdAt);
  })[0]!;
}

/**
 * Admin-only: collapse similar enemy actions (same day + similar title)
 * into one representative event with duplicateReports.
 * Government events and unique enemy events pass through unchanged.
 */
export function groupSimilarEnemyEventsForAdmin(
  events: TimelineEvent[],
): TimelineEvent[] {
  const government = events.filter((e) => e.eventType !== "enemy");
  const enemy = events.filter((e) => e.eventType === "enemy");
  if (enemy.length <= 1) return events;

  const used = new Set<string>();
  const clustered: TimelineEvent[] = [];

  for (let i = 0; i < enemy.length; i++) {
    const seed = enemy[i]!;
    if (used.has(seed.id)) continue;

    const cluster = [seed];
    used.add(seed.id);

    for (let j = i + 1; j < enemy.length; j++) {
      const candidate = enemy[j]!;
      if (used.has(candidate.id)) continue;
      if (candidate.date !== seed.date) continue;
      if (!titlesAreSimilar(seed.title, candidate.title)) continue;
      if (!locationsCompatible(seed, candidate)) continue;
      cluster.push(candidate);
      used.add(candidate.id);
    }

    if (cluster.length === 1) {
      clustered.push(seed);
      continue;
    }

    const primary = pickPrimary(cluster);
    const reports = cluster
      .filter((e) => e.id !== primary.id)
      .map((e) => ({
        id: e.id,
        title: e.title,
        createdByUserId: e.createdByUserId,
        createdByName: e.createdByName,
        createdAt: e.createdAt,
        agencyName: e.agencyName || e.organization,
      }));

    clustered.push({
      ...primary,
      duplicateReports: reports,
      commentsCount: Math.max(primary.commentsCount ?? 0, reports.length),
    });
  }

  return [...clustered, ...government].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });
}
