"use client";

import Image from "next/image";
import { ExternalLink, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Billboard } from "@/lib/types";
import { formatPersianDate, getStatusLabel, isValidUrl } from "@/lib/utils";

interface BillboardCardProps {
  billboard: Billboard;
}

export function BillboardCard({ billboard }: BillboardCardProps) {
  const handleClick = () => {
    if (isValidUrl(billboard.externalUrl)) {
      window.open(billboard.externalUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card className="overflow-hidden group">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={billboard.thumbnailUrl}
          alt={billboard.title}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{billboard.title}</h3>
          <Badge status={billboard.status}>{getStatusLabel(billboard.status)}</Badge>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>{billboard.city} — {billboard.location}</span>
        </div>
        <p className="text-xs text-muted-foreground">{formatPersianDate(billboard.date)}</p>
        {billboard.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2">{billboard.notes}</p>
        )}
        {billboard.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {billboard.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleClick}
          disabled={!isValidUrl(billboard.externalUrl)}
        >
          <ExternalLink className="h-4 w-4" />
          مشاهده بیلبورد
        </Button>
      </CardFooter>
    </Card>
  );
}
