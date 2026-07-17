import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PublicOwnerTagProps {
  ownerUserId?: string | null;
  ownerName?: string | null;
  className?: string;
}

/** Shows the uploader name on public campaign cards (instead of owner grouping). */
export function PublicOwnerTag({ ownerUserId, ownerName, className }: PublicOwnerTagProps) {
  if (!ownerUserId && !ownerName?.trim()) return null;

  const label = ownerName?.trim() || "کاربر";

  return (
    <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 font-normal", className)}>
      {label}
    </Badge>
  );
}
