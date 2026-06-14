"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionHeader } from "@/components/public/section-header";
import { VideoCard } from "@/components/public/video-card";
import type { MediaCategory, VideoWithVersions } from "@/lib/types";

interface VideosSectionProps {
  categories: MediaCategory[];
  videos: VideoWithVersions[];
}

export function VideosSection({ categories, videos }: VideosSectionProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const activeCategories = useMemo(
    () => categories.filter((cat) => videos.some((video) => video.categoryId === cat.id)),
    [categories, videos]
  );

  const filteredVideos = useMemo(() => {
    if (categoryFilter === "all") return videos;
    return videos.filter((video) => video.categoryId === categoryFilter);
  }, [videos, categoryFilter]);

  const groupedVideos = useMemo(() => {
    if (categoryFilter !== "all") return null;
    return activeCategories
      .map((category) => ({
        category,
        videos: videos.filter((video) => video.categoryId === category.id),
      }))
      .filter((group) => group.videos.length > 0);
  }, [activeCategories, categoryFilter, videos]);

  const showCategoryFilter = activeCategories.length > 0;
  const showGroupedLayout = categoryFilter === "all" && (groupedVideos?.length ?? 0) > 1;

  if (videos.length === 0) return null;

  const renderVideoGrid = (items: VideoWithVersions[]) => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((video) => (
        <VideoCard
          key={video.id}
          title={video.title}
          description={video.description}
          categoryTitle={video.category?.title}
          versions={video.versions}
        />
      ))}
    </div>
  );

  return (
    <section id="videos">
      <SectionHeader
        title="ویدیوها"
        description="همه ویدیوهای کمپین — فیلتر دسته و نسخه‌ها در مودال پخش"
      >
        {showCategoryFilter && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="دسته" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه دسته‌ها</SelectItem>
              {activeCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </SectionHeader>

      {filteredVideos.length === 0 ? (
        <div className="rounded-xl border bg-card py-12 text-center text-muted-foreground">
          ویدیویی در این دسته یافت نشد.
        </div>
      ) : showGroupedLayout && groupedVideos ? (
        <div className="space-y-10">
          {groupedVideos.map((group) => (
            <div key={group.category.id} className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">{group.category.title}</h3>
              {group.category.description && (
                <p className="text-sm text-muted-foreground">{group.category.description}</p>
              )}
              {renderVideoGrid(group.videos)}
            </div>
          ))}
        </div>
      ) : (
        renderVideoGrid(filteredVideos)
      )}
    </section>
  );
}
