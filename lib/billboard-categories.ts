export const BILLBOARD_CATEGORIES = [
  "billboard",
  "straboard",
  "bridge",
  "urban_tv",
  "bus_metro",
  "wrap",
  "scaffolding",
  "fence_wall_banner",
  "stand",
  "other",
] as const;

export type BillboardCategory = (typeof BILLBOARD_CATEGORIES)[number];

export const billboardCategoryLabels: Record<BillboardCategory, string> = {
  billboard: "بیلبورد",
  straboard: "استرابورد",
  bridge: "عرشه پل",
  urban_tv: "تلویزیون شهری",
  bus_metro: "ایستگاه اتوبوس و مترو",
  wrap: "لم پوست",
  scaffolding: "داربست و اسپیس",
  fence_wall_banner: "بنر روی نرده و دیوار",
  stand: "استند",
  other: "سایر",
};

/** Remap legacy stored keys to the current taxonomy. */
export const LEGACY_BILLBOARD_CATEGORY_MAP: Record<string, BillboardCategory> = {
  banner: "fence_wall_banner",
  narde: "fence_wall_banner",
  sakhteman: "fence_wall_banner",
  lightbox: "other",
  monitor: "urban_tv",
  bus_shelter: "bus_metro",
  darbast: "scaffolding",
};

export function getBillboardCategoryLabel(value: string | null | undefined): string {
  if (!value) return "نامشخص";
  const matched = matchBillboardCategoryKey(value);
  if (matched) return billboardCategoryLabels[matched];
  return value;
}

const billboardCategoryLookup = new Map<string, BillboardCategory>(
  BILLBOARD_CATEGORIES.flatMap((key) => [
    [key, key],
    [billboardCategoryLabels[key], key],
  ])
);

/** Extra aliases seen in imports / free text (Latin + Persian variants). */
const billboardCategoryAliases: Record<string, BillboardCategory> = {
  "estra board": "straboard",
  estraboard: "straboard",
  "estra-board": "straboard",
  "استرا بورد": "straboard",
  استرابرد: "straboard",
  "bill board": "billboard",
  "بیلبورد شهری": "billboard",
  "light box": "other",
  lightbox: "other",
  "لایت باکس": "other",
  "لایت‌باکس": "other",
  لایتباکس: "other",
  banner: "fence_wall_banner",
  بنر: "fence_wall_banner",
  narde: "fence_wall_banner",
  نرده: "fence_wall_banner",
  sakhteman: "fence_wall_banner",
  ساختمان: "fence_wall_banner",
  "بنر روی نرده": "fence_wall_banner",
  "بنر روی دیوار": "fence_wall_banner",
  monitor: "urban_tv",
  مانیتور: "urban_tv",
  "تلویزیون شهری": "urban_tv",
  "urban tv": "urban_tv",
  bus_shelter: "bus_metro",
  "ایستگاه اتوبوس": "bus_metro",
  "ایستگاه مترو": "bus_metro",
  "ایستگاه اتوبوس و مترو": "bus_metro",
  darbast: "scaffolding",
  داربست: "scaffolding",
  اسپیس: "scaffolding",
  "داربست و اسپیس": "scaffolding",
  "پل عابرپیاده": "bridge",
  "پل عابر پیاده": "bridge",
  "عرشه پل": "bridge",
  bridge_deck: "bridge",
  لمپوست: "wrap",
  "لم پوست": "wrap",
  "لم‌پوست": "wrap",
  wrap: "wrap",
  استند: "stand",
  stand: "stand",
};

export function matchBillboardCategoryKey(
  value: string | null | undefined
): BillboardCategory | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  const slug = normalized.toLowerCase().replace(/-/g, "_");
  if (BILLBOARD_CATEGORIES.includes(slug as BillboardCategory)) {
    return slug as BillboardCategory;
  }

  if (LEGACY_BILLBOARD_CATEGORY_MAP[slug]) {
    return LEGACY_BILLBOARD_CATEGORY_MAP[slug];
  }

  const aliasKey = normalized.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (billboardCategoryAliases[aliasKey]) {
    return billboardCategoryAliases[aliasKey];
  }
  if (billboardCategoryAliases[normalized]) {
    return billboardCategoryAliases[normalized];
  }

  return (
    billboardCategoryLookup.get(normalized) ??
    billboardCategoryLookup.get(slug) ??
    billboardCategoryLookup.get(aliasKey) ??
    null
  );
}

function findCategoryLabelInTags(tags: string[]): string | null {
  const knownLabels = new Set(Object.values(billboardCategoryLabels));

  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed || trimmed.startsWith("map:") || trimmed.startsWith("assignment:")) continue;
    if (knownLabels.has(trimmed)) return trimmed;

    const matched = matchBillboardCategoryKey(trimmed);
    if (matched) return billboardCategoryLabels[matched];
  }

  return null;
}

export function resolveBillboardCategoryDisplay(billboard: {
  category?: string | null;
  billboardTypeLabel?: string | null;
  tags?: string[];
}): string | null {
  const categoryKey = matchBillboardCategoryKey(billboard.category);
  if (categoryKey) return billboardCategoryLabels[categoryKey];

  const typeLabel = billboard.billboardTypeLabel?.trim();
  if (typeLabel) {
    const fromLabel = matchBillboardCategoryKey(typeLabel);
    return fromLabel ? billboardCategoryLabels[fromLabel] : typeLabel;
  }

  if (billboard.tags?.length) {
    return findCategoryLabelInTags(billboard.tags);
  }

  return null;
}

export function resolveBillboardCategoryLabel(billboard: {
  category?: string | null;
  billboardTypeLabel?: string | null;
  tags?: string[];
}): string {
  return resolveBillboardCategoryDisplay(billboard) ?? "نامشخص";
}
