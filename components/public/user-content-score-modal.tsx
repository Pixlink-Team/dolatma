"use client";

import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { UserContentScoreItem } from "@/lib/city-leaderboard";
import { formatPersianNumber } from "@/lib/utils";

interface UserContentScoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  items: UserContentScoreItem[];
}

export function UserContentScoreModal({
  open,
  onOpenChange,
  userName,
  items,
}: UserContentScoreModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>محتوای امتیازدار — {userName}</DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            محتوایی برای این کاربر یافت نشد.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={`${item.contentType}-${item.id}`}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="h-14 w-14 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                    {item.typeLabel}
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {item.typeLabel}
                  </Badge>
                </div>
                <div className="inline-flex items-center gap-1 text-sm text-amber-700 dark:text-amber-400">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {item.score != null ? formatPersianNumber(item.score) : "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
