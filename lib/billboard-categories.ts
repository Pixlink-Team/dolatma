export const BILLBOARD_CATEGORIES = [
  "straboard",
  "banner",
  "billboard",
  "lightbox",
  "monitor",
  "bridge",
  "bus_shelter",
  "other",
] as const;

export type BillboardCategory = (typeof BILLBOARD_CATEGORIES)[number];

export const billboardCategoryLabels: Record<BillboardCategory, string> = {
  straboard: "استرابورد",
  banner: "بنر",
  billboard: "بیلبورد",
  lightbox: "لایت‌باکس",
  monitor: "مانیتور",
  bridge: "پل عابرپیاده",
  bus_shelter: "ایستگاه اتوبوس",
  other: "سایر",
};

export function getBillboardCategoryLabel(value: string | null | undefined): string {
  if (!value) return "نامشخص";
  return billboardCategoryLabels[value as BillboardCategory] ?? value;
}
