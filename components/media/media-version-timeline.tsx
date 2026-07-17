"use client";

import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPersianDate, getStatusLabel } from "@/lib/utils";

export interface MediaVersionItem {
  id: string;
  versionNumber: number;
  thumbnailUrl: string;
  imageUrl?: string;
  videoUrl?: string;
  date: string;
  notes?: string | null;
  status: string;
  isFinal: boolean;
  duration?: string | null;
}

interface MediaVersionTimelineProps {
  versions: MediaVersionItem[];
  onVersionClick: (version: MediaVersionItem) => void;
  type?: "poster" | "video";
}

export function MediaVersionTimeline({
  versions,
  onVersionClick,
  type = "poster",
}: MediaVersionTimelineProps) {
  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">نسخه‌ای ثبت نشده است.</p>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-1/2 right-0 left-0 h-0.5 bg-border hidden md:block -translate-y-1/2" />
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
        {versions.map((version, index) => (
          <button
            key={version.id}
            type="button"
            onClick={() => onVersionClick(version)}
            className="snap-start shrink-0 w-40 md:w-44 text-right group"
          >
            <Card className="overflow-hidden transition-all hover:ring-2 hover:ring-primary/50 cursor-pointer">
              <div className="relative aspect-[3/4] bg-muted">
                <Image
                  src={version.thumbnailUrl}
                  alt={`نسخه ${version.versionNumber}`}
                  fill
                  className="object-cover"
                  sizes="176px"
                />
                {version.isFinal && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="overlay" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      نسخه نهایی
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    {type === "video" ? "ویدیو" : "نسخه"} {version.versionNumber}
                  </span>
                  <Badge status={version.status} className="text-[10px] px-1.5">
                    {getStatusLabel(version.status)}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {formatPersianDate(version.date)}
                </p>
                {version.duration && (
                  <p className="text-[11px] text-muted-foreground">مدت: {version.duration}</p>
                )}
                {version.notes && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{version.notes}</p>
                )}
              </CardContent>
            </Card>
            {index < versions.length - 1 && (
              <div className="hidden md:flex absolute items-center justify-center" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
