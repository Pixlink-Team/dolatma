"use client";

import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminItemActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  compact?: boolean;
}

export function AdminItemActions({
  onView,
  onEdit,
  onDelete,
  className,
  compact = false,
}: AdminItemActionsProps) {
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      onClick={(event) => event.stopPropagation()}
    >
      {onView && (
        <Button
          type="button"
          variant={compact ? "secondary" : "outline"}
          size={compact ? "icon" : "sm"}
          className={compact ? "h-7 w-7" : undefined}
          onClick={onView}
          title="نمایش"
        >
          <Eye className="h-3.5 w-3.5" />
          {!compact && <span>نمایش</span>}
        </Button>
      )}
      {onEdit && (
        <Button
          type="button"
          variant={compact ? "secondary" : "outline"}
          size={compact ? "icon" : "sm"}
          className={compact ? "h-7 w-7" : undefined}
          onClick={onEdit}
          title="ویرایش"
        >
          <Pencil className="h-3.5 w-3.5" />
          {!compact && <span>ویرایش</span>}
        </Button>
      )}
      {onDelete && (
        <Button
          type="button"
          variant={compact ? "destructive" : "destructive"}
          size={compact ? "icon" : "sm"}
          className={compact ? "h-7 w-7" : undefined}
          onClick={onDelete}
          title="حذف"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {!compact && <span>حذف</span>}
        </Button>
      )}
    </div>
  );
}
