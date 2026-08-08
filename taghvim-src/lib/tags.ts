/** Built-in government action tag for national hero publications */
export const NATIONAL_HERO_TAG = "قهرمان ملی";

export function hasNationalHeroTag(tags: string[] | null | undefined): boolean {
  return (tags ?? []).includes(NATIONAL_HERO_TAG);
}

export function withNationalHeroTag(
  tags: string[] | null | undefined,
  enabled: boolean,
): string[] {
  const next = [...(tags ?? [])].filter((t) => t !== NATIONAL_HERO_TAG);
  if (enabled) next.unshift(NATIONAL_HERO_TAG);
  return next;
}
