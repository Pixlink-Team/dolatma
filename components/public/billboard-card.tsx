"use client";

import { Eye, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { BillboardThumbnail } from "@/components/public/billboard-thumbnail";
import { PublishStatusBadge } from "@/components/public/publish-status-badge";
import {
  getBillboardDateLabel,
  getBillboardDisplayDays,
} from "@/lib/billboards";
import { parseProvinceFromBillboard } from "@/lib/billboard-form-utils";
import type { Billboard } from "@/lib/types";
import { formatPersianDate, formatPersianNumber } from "@/lib/utils";

interface BillboardCardProps {
  billboard: Billboard;
  onView: (billboard: Billboard) => void;
}

function resolveBillboardAddress(billboard: Billboard): string {
  const location = billboard.location?.trim() ?? "";
  const description = billboard.description?.trim() ?? "";
  if (location && description && location !== description) {
    return `${location} — ${description}`;
  }
  return location || description || "—";
}

export function BillboardCard({ billboard, onView }: BillboardCardProps) {
  const province = parseProvinceFromBillboard(billboard) || "نامشخص";
  const address = resolveBillboardAddress(billboard);
  const dateLabel = getBillboardDateLabel(billboard);
  const displayDays = getBillboardDisplayDays(billboard);

  return (
    <Card className="group flex h-full w-full max-w-sm flex-col overflow-hidden">
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-muted">
        <BillboardThumbnail
          billboard={billboard}
          alt={billboard.title}
          sizes="(max-width: 768px) 100vw, 320px"
          imageClassName="transition-transform group-hover:scale-105"
        />
        {!billboard.published && (
          <div className="absolute top-3 left-3">
            <PublishStatusBadge published={billboard.published} className="bg-background/90 text-xs" />
          </div>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col space-y-3 p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] font-semibold leading-tight">{billboard.title}</h3>

        {billboard.billboardTypeLabel && (
          <Badge variant="secondary" className="w-fit text-xs">
            {billboard.billboardTypeLabel}
          </Badge>
        )}

        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-start gap-1">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{province}</span>
          </div>
          <p className="line-clamp-2 pr-5 text-xs leading-relaxed">{address}</p>
        </div>

        <div className="mt-auto space-y-1 text-xs text-muted-foreground">
          <p>{dateLabel || formatPersianDate(billboard.date)}</p>
          {displayDays != null && displayDays > 0 && (
            <p>{formatPersianNumber(displayDays)} روز نمایش</p>
          )}
        </div>
      </CardContent>

      <CardFooter className="mt-auto p-4 pt-0">
        <Button variant="outline" size="sm" className="w-full" onClick={() => onView(billboard)}>
          <Eye className="h-4 w-4" />
          مشاهده بیلبورد
        </Button>
      </CardFooter>
    </Card>
  );
}
