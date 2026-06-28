import type { DataOwnerGroup } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface OwnerGroupedSectionProps<T> {
  groups: DataOwnerGroup<T>[];
  children: (items: T[], group: DataOwnerGroup<T>) => React.ReactNode;
}

export function OwnerGroupedSection<T>({ groups, children }: OwnerGroupedSectionProps<T>) {
  if (groups.length <= 1) {
    const onlyGroup = groups[0];
    return onlyGroup ? <>{children(onlyGroup.items, onlyGroup)}</> : null;
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.ownerKey} className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{group.ownerLabel}</Badge>
            <span className="text-xs text-muted-foreground">{group.items.length} مورد</span>
          </div>
          {children(group.items, group)}
        </div>
      ))}
    </div>
  );
}
