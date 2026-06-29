"use client";

import Image from "next/image";
import { Download, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActivityTypeLabel } from "@/lib/activity-types";
import {
  downloadMedia,
  getFilenameFromUrl,
  isAparatVideoInput,
  isDirectVideoUrl,
  isEmbeddableVideoUrl,
  resolveAbsoluteMediaUrl,
  resolveVideoEmbedUrl,
} from "@/lib/media-utils";
import type { CampaignActivity } from "@/lib/types";
import { formatPersianDate } from "@/lib/utils";

interface ActivityMediaDialogProps {
  activity: CampaignActivity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityMediaDialog({ activity, open, onOpenChange }: ActivityMediaDialogProps) {
  if (!activity) return null;

  const hasVideo = Boolean(activity.videoUrl?.trim());
  const hasImage = Boolean(activity.imageUrl?.trim());
  const canPlayVideo = hasVideo && isEmbeddableVideoUrl(activity.videoUrl!);
  const videoSrc = canPlayVideo ? resolveAbsoluteMediaUrl(resolveVideoEmbedUrl(activity.videoUrl!)) : "";
  const isDirectVideo = canPlayVideo && isDirectVideoUrl(videoSrc);

  const handleDownloadImage = () => {
    if (!activity.imageUrl) return;
    void downloadMedia(
      activity.imageUrl,
      getFilenameFromUrl(activity.imageUrl, `${activity.title}.jpg`)
    );
  };

  const handleDownloadVideo = () => {
    if (!activity.videoUrl) return;
    void downloadMedia(
      activity.videoUrl,
      getFilenameFromUrl(activity.videoUrl, `${activity.title}.mp4`)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
            {activity.title}
            <Badge variant="outline">{getActivityTypeLabel(activity.activityType)}</Badge>
          </DialogTitle>
        </DialogHeader>

        {hasVideo && (
          <div className="relative aspect-video w-full bg-black">
            {canPlayVideo ? (
              isDirectVideo ? (
                <video
                  key={activity.id}
                  src={videoSrc}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full bg-black"
                />
              ) : (
                <iframe
                  key={activity.id}
                  src={videoSrc}
                  title={activity.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              )
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-white">
                پیش‌نمایش ویدیو در دسترس نیست
              </div>
            )}
          </div>
        )}

        {!hasVideo && hasImage && (
          <div className="relative mx-4 aspect-video max-h-[60vh] w-auto bg-muted">
            <Image
              src={activity.imageUrl!}
              alt={activity.title}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        )}

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{formatPersianDate(activity.activityDate)}</span>
            {activity.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {activity.location}
              </span>
            )}
          </div>

          {activity.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{activity.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {hasImage && (
              <Button variant="outline" size="sm" onClick={handleDownloadImage} className="gap-2">
                <Download className="h-4 w-4" />
                دانلود تصویر
              </Button>
            )}
            {hasVideo && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadVideo}
                className="gap-2"
                disabled={!canPlayVideo || isAparatVideoInput(activity.videoUrl!)}
              >
                <Download className="h-4 w-4" />
                دانلود ویدیو
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
