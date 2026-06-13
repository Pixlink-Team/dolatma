"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionHeader } from "@/components/public/section-header";
import {
  MediaVersionTimeline,
  type MediaVersionItem,
} from "@/components/media/media-version-timeline";
import { VideoModal } from "@/components/media/video-modal";
import type { MediaCategory, VideoWithVersions } from "@/lib/types";

interface VideosSectionProps {
  categories: MediaCategory[];
  videos: VideoWithVersions[];
}

export function VideosSection({ categories, videos }: VideosSectionProps) {
  const [selectedVersion, setSelectedVersion] = useState<{
    version: MediaVersionItem;
    title: string;
  } | null>(null);

  const defaultCategory = categories[0]?.id ?? "all";

  return (
    <section id="videos">
      <SectionHeader
        title="ویدیوها"
        description="ویدیوهای کمپین با تاریخچه نسخه‌ها"
      />

      {categories.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card">
          ویدیویی ثبت نشده است.
        </div>
      ) : (
        <Tabs defaultValue={defaultCategory}>
          <TabsList className="mb-4">
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>{cat.title}</TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => {
            const categoryVideos = videos.filter((v) => v.categoryId === cat.id);
            return (
              <TabsContent key={cat.id} value={cat.id} className="space-y-6">
                {categoryVideos.length === 0 ? (
                  <p className="text-muted-foreground text-sm">ویدیویی در این دسته وجود ندارد.</p>
                ) : (
                  categoryVideos.map((video) => (
                    <Card key={video.id}>
                      <CardHeader>
                        <CardTitle className="text-base">{video.title}</CardTitle>
                        {video.description && (
                          <p className="text-sm text-muted-foreground">{video.description}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <MediaVersionTimeline
                          type="video"
                          versions={video.versions.map((v) => ({
                            id: v.id,
                            versionNumber: v.versionNumber,
                            thumbnailUrl: v.thumbnailUrl,
                            videoUrl: v.videoUrl,
                            date: v.date,
                            notes: v.notes,
                            status: v.status,
                            isFinal: v.isFinal,
                            duration: v.duration,
                          }))}
                          onVersionClick={(version) =>
                            setSelectedVersion({ version, title: video.title })
                          }
                        />
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {selectedVersion && selectedVersion.version.videoUrl && (
        <VideoModal
          open={!!selectedVersion}
          onOpenChange={(open) => !open && setSelectedVersion(null)}
          videoUrl={selectedVersion.version.videoUrl}
          title={selectedVersion.title}
          versionNumber={selectedVersion.version.versionNumber}
          date={selectedVersion.version.date}
          notes={selectedVersion.version.notes}
          status={selectedVersion.version.status}
          isFinal={selectedVersion.version.isFinal}
          duration={selectedVersion.version.duration}
        />
      )}
    </section>
  );
}
