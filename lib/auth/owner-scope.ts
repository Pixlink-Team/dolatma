/**
 * Owner visibility scope for admin panel queries.
 * - `undefined` — no filter (admin / client oversight)
 * - `null` or empty array — match nothing
 * - `string` / `string[]` — rows owned by these user ids
 */
export type OwnerScope = string | string[] | null | undefined;

export function normalizeOwnerIds(scope: OwnerScope): string[] | undefined {
  if (scope === undefined) return undefined;
  if (scope === null) return [];
  return Array.isArray(scope) ? scope : [scope];
}

export function ownerMatchesScope(
  ownerUserId: string | null | undefined,
  scope: OwnerScope
): boolean {
  const ids = normalizeOwnerIds(scope);
  if (ids === undefined) return true;
  if (!ownerUserId) return false;
  return ids.includes(ownerUserId);
}
