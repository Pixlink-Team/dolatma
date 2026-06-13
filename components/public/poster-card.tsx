"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LightboxModal } from "@/components/media/lightbox-modal";
import type { PosterVersion } from "@/lib/types";
import { formatPersianDate, getStatusLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PosterCardProps {
  title: string;
  description?: string | null;
  versions: PosterVersion[];
}

export function PosterCard({ title, description, versions }: PosterCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [lightboxVersion, setLightboxVersion] = useState<PosterVersion | null>(null);

  const sortedVersions = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
  const finalVersion = sortedVersions.find((v) => v.isFinal) ?? sortedVersions[sortedVersions.length - 1];
  const previousVersions = sortedVersions.filter((v) => v.id !== finalVersion?.id);

  if (!finalVersion) return null;

  return (
    <>
      <Card className="overflow-hidden">
        <div
          className="relative aspect-[3/4] max-h-80 bg-muted cursor-pointer group"
          onClick={() => setLightboxVersion(finalVersion)}
        >
          <Image
            src={finalVersion.thumbnailUrl}
            alt={title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 25vw"
          />
          {finalVersion.isFinal && (
            <div className="absolute top-3 right-3">
              <Badge status="final">نسخه نهایی</Badge>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg transition-opacity">
              مشاهده
            </span>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>نسخه {finalVersion.versionNumber}</span>
            <Badge status={finalVersion.status} className="text-[10px]">
              {getStatusLabel(finalVersion.status)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{formatPersianDate(finalVersion.date)}</p>

          {previousVersions.length > 0 && (
            <div className="border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-9 text-xs"
                onClick={() => setExpanded(!expanded)}
              >
                <span className="flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  {previousVersions.length} نسخه قبلی
                </span>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>

              <div
                className={cn(
                  "grid gap-2 overflow-hidden transition-all duration-300",
                  expanded ? "mt-3 max-h-96 opacity-100" : "max-h-0 opacity-0"
                )}
              >
                {previousVersions.map((version) => (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => setLightboxVersion(version)}
                    className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors text-right w-full"
                  >
                    <div className="relative w-12 h-14 shrink-0 rounded overflow-hidden bg-muted">
                      <Image
                        src={version.thumbnailUrl}
                        alt={`نسخه ${version.versionNumber}`}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">نسخه {version.versionNumber}</span>
                        <Badge status={version.status} className="text-[10px] shrink-0">
                          {getStatusLabel(version.status)}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatPersianDate(version.date)}
                      </p>
                      {version.notes && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{version.notes}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {lightboxVersion && (
        <LightboxModal
          open={!!lightboxVersion}
          onOpenChange={(open) => !open && setLightboxVersion(null)}
          imageUrl={lightboxVersion.imageUrl}
          title={title}
          versionNumber={lightboxVersion.versionNumber}
          date={lightboxVersion.date}
          notes={lightboxVersion.notes}
          status={lightboxVersion.status}
          isFinal={lightboxVersion.isFinal}
        />
      )}
    </>
  );
}
