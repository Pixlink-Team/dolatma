"use client";

import { Badge } from "@/components/ui/badge";
import { formatPlanLabelDisplay, normalizePlanLabels } from "@/lib/content-topics";
import { cn } from "@/lib/utils";

interface AdminPlanLabelsBadgesProps {
  planLabels?: string[] | null;
  planLabel?: string | null;
  className?: string;
  maxVisible?: number;
}

export function AdminPlanLabelsBadges({
  planLabels,
  planLabel,
  className,
  maxVisible = 2,
}: AdminPlanLabelsBadgesProps) {
  const labels = normalizePlanLabels(planLabels, planLabel);
  if (labels.length === 0) return null;

  const visible = labels.slice(0, maxVisible);
  const remaining = labels.length - visible.length;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visible.map((label) => (
        <Badge key={label} variant="secondary" className="max-w-full truncate text-[10px] px-1.5 py-0 font-normal">
          {formatPlanLabelDisplay(label)}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
          +{remaining}
        </Badge>
      )}
    </div>
  );
}
