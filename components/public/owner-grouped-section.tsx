import type { DataOwnerGroup } from "@/lib/types";

interface OwnerGroupedSectionProps<T> {
  groups: DataOwnerGroup<T>[];
  children: (items: T[], group: DataOwnerGroup<T>) => React.ReactNode;
  /**
   * When set (newest/oldest/top-scored), render a single chronological stream
   * so owner grouping does not break upload-time order.
   */
  flatItems?: T[] | null;
}

/**
 * Renders all items in a single flat list (no per-user group headers).
 * Owner identity is shown as a tag on each card instead.
 */
export function OwnerGroupedSection<T>({ groups, children, flatItems }: OwnerGroupedSectionProps<T>) {
  const items = flatItems ?? groups.flatMap((group) => group.items);
  if (items.length === 0) return null;

  const flatGroup: DataOwnerGroup<T> = {
    ownerKey: "all",
    ownerLabel: "",
    ownerUserId: null,
    ownerProvince: null,
    ownerCity: null,
    items,
  };

  return <>{children(items, flatGroup)}</>;
}
