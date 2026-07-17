"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Download, History, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VideoModal } from "@/components/media/video-modal";
import { VideoThumbnail } from "@/components/media/video-thumbnail";
import { ContentScoreControl } from "@/components/admin/content-score-control";
import { PublicOwnerTag } from "@/components/public/public-owner-tag";
import { useContentScoreAccess } from "@/lib/context/content-score-context";
import type { VideoVersion } from "@/lib/types";
import { downloadMedia, getFilenameFromUrl, hasDistinctThumbnail, resolveDisplayVersion } from "@/lib/media-utils";
import { cn, formatPersianDate } from "@/lib/utils";

interface VideoCardProps {
  id?: string;
  campaignId?: string;
  title: string;
  description?: string | null;
  versions: VideoVersion[];
  score?: number | null;
  ownerUserId?: string | null;
  ownerName?: string | null;
}

export function VideoCard({
  id,
  campaignId,
  title,
  description,
  versions,
  score,
  ownerUserId,
  ownerName,
}: VideoCardProps) {
  const { canScore, campaignId: scoreCampaignId } = useContentScoreAccess();
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  const sortedVersions = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
  const finalVersion = resolveDisplayVersion(sortedVersions);
  const previousVersions = sortedVersions.filter((v) => v.id !== finalVersion?.id);

  if (!finalVersion) return null;

  const openModal = (versionId: string) => {
    setActiveVersionId(versionId);
    setModalOpen(true);
  };

  const handleDownloadVideo = (version: VideoVersion, event: React.MouseEvent) => {
    event.stopPropagation();
    void downloadMedia(
      version.videoUrl,
      getFilenameFromUrl(version.videoUrl, `${title}-v${version.versionNumber}.mp4`)
    );
  };

  const handleDownloadCover = (version: VideoVersion, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!hasDistinctThumbnail(version.thumbnailUrl, version.videoUrl)) return;
    void downloadMedia(
      version.thumbnailUrl,
      getFilenameFromUrl(version.thumbnailUrl, `${title}-v${version.versionNumber}-cover.jpg`)
    );
  };

  return (
    <>
      <Card className="w-full overflow-hidden py-0 gap-0">
        <div
          className="relative aspect-video cursor-pointer overflow-hidden bg-muted group"
          onClick={() => openModal(finalVersion.id)}
        >
          <VideoThumbnail
            videoUrl={finalVersion.videoUrl}
            thumbnailUrl={finalVersion.thumbnailUrl}
            alt={title}
            className="object-contain transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors pointer-events-none">
            <Play className="h-12 w-12 text-white" />
          </div>
          <div className="absolute top-3 right-3">
            {finalVersion.isFinal && <Badge status="final">نسخه نهایی</Badge>}
          </div>
          <div className="absolute bottom-3 left-3 flex gap-1">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-8 w-8 opacity-90"
              onClick={(e) => handleDownloadVideo(finalVersion, e)}
              aria-label="دانلود ویدیو"
            >
              <Download className="h-4 w-4" />
            </Button>
            {hasDistinctThumbnail(finalVersion.thumbnailUrl, finalVersion.videoUrl) && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 opacity-90"
                onClick={(e) => handleDownloadCover(finalVersion, e)}
                aria-label="دانلود کاور"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          <div>
            <div className="flex flex-wrap items-start gap-1.5">
              <h3 className="font-semibold">{title}</h3>
              <PublicOwnerTag ownerUserId={ownerUserId} ownerName={ownerName} />
            </div>
            {description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>نسخه {finalVersion.versionNumber}{finalVersion.duration ? ` — ${finalVersion.duration}` : ""}</span>
            {finalVersion.isFinal && (
              <Badge status="final" className="text-[10px]">
                نسخه نهایی
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{formatPersianDate(finalVersion.date)}</p>

          {id && (canScore || score != null) && (
            <ContentScoreControl
              campaignId={campaignId || scoreCampaignId}
              contentType="video"
              contentId={id}
              score={score}
              canScore={canScore}
              compact
            />
          )}

          {previousVersions.length > 0 && (
            <div className="border-t pt-3">
              <Button variant="ghost" size="sm" className="w-full justify-between h-9 text-xs" onClick={() => setExpanded(!expanded)}>
                <span className="flex items-center gap-1.5"><History className="h-3.5 w-3.5" />{previousVersions.length} نسخه قبلی</span>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <div className={cn("grid gap-2 overflow-hidden transition-all duration-300", expanded ? "mt-3 max-h-96 opacity-100" : "max-h-0 opacity-0")}>
                {previousVersions.map((version) => (
                  <div key={version.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                    <button
                      type="button"
                      onClick={() => openModal(version.id)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-right"
                    >
                      <div className="relative w-16 h-10 shrink-0 rounded overflow-hidden bg-muted">
                        <VideoThumbnail
                          videoUrl={version.videoUrl}
                          thumbnailUrl={version.thumbnailUrl}
                          alt={`نسخه ${version.versionNumber}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium">نسخه {version.versionNumber}</span>
                          {version.isFinal && (
                            <Badge status="final" className="text-[10px] shrink-0">
                              نسخه نهایی
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatPersianDate(version.date)}</p>
                      </div>
                    </button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => handleDownloadVideo(version, e)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {modalOpen && activeVersionId && (
        <VideoModal
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setActiveVersionId(null);
          }}
          title={title}
          versions={sortedVersions}
          initialVersionId={activeVersionId}
        />
      )}
    </>
  );
}
