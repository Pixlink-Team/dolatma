export interface ContentTopic {
  name: string;
  subtopics: string[];
}

const TOPIC_SEP = "|";

/** Encode topic + optional subtopic into a single plan label token. */
export function encodePlanLabel(topic: string, subtopic?: string | null): string {
  const t = topic.trim();
  const s = subtopic?.trim();
  if (!t) return "";
  return s ? `${t}${TOPIC_SEP}${s}` : t;
}

export function decodePlanLabel(value: string): { topic: string; subtopic: string | null } {
  const raw = value.trim();
  if (!raw) return { topic: "", subtopic: null };
  const idx = raw.indexOf(TOPIC_SEP);
  if (idx < 0) return { topic: raw, subtopic: null };
  return {
    topic: raw.slice(0, idx).trim(),
    subtopic: raw.slice(idx + 1).trim() || null,
  };
}

export function formatPlanLabelDisplay(value: string): string {
  const { topic, subtopic } = decodePlanLabel(value);
  if (!topic) return value;
  return subtopic ? `${topic} — ${subtopic}` : topic;
}

export function normalizeContentTopics(value: unknown): ContentTopic[] {
  if (!Array.isArray(value)) return [];

  const result: ContentTopic[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      const name = item.trim();
      if (name) result.push({ name, subtopics: [] });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const record = item as { name?: unknown; subtopics?: unknown };
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) continue;
    const subtopics = Array.isArray(record.subtopics)
      ? record.subtopics
          .filter((s): s is string => typeof s === "string")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    result.push({ name, subtopics: [...new Set(subtopics)] });
  }
  return result;
}

/** Flat list of selectable tokens for filters and multi-select. */
export function flattenTopicOptions(topics: ContentTopic[]): string[] {
  const options: string[] = [];
  for (const topic of topics) {
    options.push(topic.name);
    for (const sub of topic.subtopics) {
      options.push(encodePlanLabel(topic.name, sub));
    }
  }
  return options;
}

export function contentPlansFromTopics(topics: ContentTopic[]): string[] {
  return flattenTopicOptions(topics);
}

export function normalizePlanLabels(
  planLabels?: string[] | null,
  legacyPlanLabel?: string | null
): string[] {
  const fromArray = (planLabels ?? [])
    .map((item) => item.trim())
    .filter(Boolean);
  if (fromArray.length > 0) return [...new Set(fromArray)];
  const legacy = legacyPlanLabel?.trim();
  return legacy ? [legacy] : [];
}

export function matchesPlanLabelFilter(
  planLabels: string[] | null | undefined,
  legacyPlanLabel: string | null | undefined,
  filter: string
): boolean {
  if (!filter || filter === "all") return true;
  const labels = normalizePlanLabels(planLabels, legacyPlanLabel);
  if (labels.length === 0) return false;

  // Exact match, or topic-only filter matches all its subtopics
  return labels.some((label) => {
    if (label === filter) return true;
    const decoded = decodePlanLabel(label);
    if (decoded.topic === filter) return true;
    return false;
  });
}

/** True when any selected filter label matches the item (empty selected = all). */
export function matchesAnyPlanLabelFilter(
  planLabels: string[] | null | undefined,
  legacyPlanLabel: string | null | undefined,
  selectedLabels: string[]
): boolean {
  if (selectedLabels.length === 0) return true;
  return selectedLabels.some((label) =>
    matchesPlanLabelFilter(planLabels, legacyPlanLabel, label)
  );
}
