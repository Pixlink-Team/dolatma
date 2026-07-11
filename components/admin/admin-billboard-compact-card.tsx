"use client";

import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminOwnerBadge } from "@/components/admin/admin-owner-badge";
import { ContentScoreControl } from "@/components/admin/content-score-control";
import { MediaThumbnail } from "@/components/ui/media-thumbnail";
import { getBillboardCategoryLabel } from "@/lib/billboard-categories";
import { formatBillboardCityLine } from "@/lib/billboard-location";
import type { Billboard } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AdminBillboardCompactCardProps {
  billboard: Billboard;
  onClick: () => void;
  onDelete?: (billboard: Billboard) => void;
  canScore?: boolean;
  onScoreSaved?: (billboard: Billboard, score: number | null) => void;
}

export function AdminBillboardCompactCard({
  billboard,
  onClick,
  onDelete,
  canScore = false,
  onScoreSaved,
}: AdminBillboardCompactCardProps) {
  return (
    <div className="group relative w-full overflow-hidden rounded-xl border bg-card text-right transition-all hover:border-primary hover:shadow-md">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          <MediaThumbnail
            src={billboard.thumbnailUrl}
            alt={billboard.title}
            kind="poster"
            sizes="200px"
            objectFit="cover"
          />
          <div className="absolute top-1.5 right-1.5 flex flex-wrap gap-1 justify-end">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {getBillboardCategoryLabel(billboard.category)}
            </Badge>
          </div>
        </div>
        <div className="space-y-1 p-2">
          <p className="truncate text-xs font-medium">{billboard.title}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {formatBillboardCityLine(billboard)}
          </p>
          <AdminOwnerBadge ownerUserId={billboard.ownerUserId} ownerName={billboard.ownerName} />
        </div>
      </button>

      {(canScore || billboard.score != null) && (
        <div className="px-2 pb-2">
          <ContentScoreControl
            campaignId={billboard.campaignId}
            contentType="billboard"
            contentId={billboard.id}
            score={billboard.score}
            canScore={canScore}
            compact
            onScoreSaved={(score) => onScoreSaved?.(billboard, score)}
          />
        </div>
      )}

      {onDelete && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="absolute bottom-2 left-2 z-10 h-7 gap-1 px-2 text-[10px]"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(billboard);
          }}
        >
          <Trash2 className="h-3 w-3" />
          حذف
        </Button>
      )}
    </div>
  );
}

interface AdminBillboardAddCardProps {
  onClick: () => void;
  disabled?: boolean;
}

export function AdminBillboardAddCard({ onClick, disabled }: AdminBillboardAddCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group w-full overflow-hidden rounded-xl border-2 border-dashed bg-muted/30 text-muted-foreground transition-all",
        "hover:border-primary hover:bg-primary/5 hover:text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50"
      )}
    >
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 p-4">
        <span className="text-3xl leading-none">+</span>
        <span className="text-xs font-medium">ثبت جدید</span>
      </div>
    </button>
  );
}
