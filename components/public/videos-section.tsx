"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/public/collapsible-section";
import { VideoCard } from "@/components/public/video-card";
import {
  PUBLIC_MEDIA_GRID_CLASS,
  PUBLIC_MEDIA_PAGE_SIZE,
  sortByPublicMediaOrder,
  type PublicMediaSort,
} from "@/lib/public-media-section";
import type { MediaCategory, VideoWithVersions } from "@/lib/types";
import { formatPersianNumber } from "@/lib/utils";

interface VideosSectionProps {
  categories: MediaCategory[];
  videos: VideoWithVersions[];
}

function getVideoLatestDate(video: VideoWithVersions): string | undefined {
  return [...video.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0]?.date;
}

export function VideosSection({ categories, videos }: VideosSectionProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sort, setSort] = useState<PublicMediaSort>("default");
  const [visibleCount, setVisibleCount] = useState(PUBLIC_MEDIA_PAGE_SIZE);

  const activeCategories = useMemo(
    () => categories.filter((cat) => videos.some((video) => video.categoryId === cat.id)),
    [categories, videos]
  );

  const filteredVideos = useMemo(() => {
    const filtered =
      categoryFilter === "all"
        ? videos
        : videos.filter((video) => video.categoryId === categoryFilter);
    return sortByPublicMediaOrder(filtered, sort, getVideoLatestDate);
  }, [videos, categoryFilter, sort]);

  const visibleVideos = filteredVideos.slice(0, visibleCount);
  const hasMore = visibleCount < filteredVideos.length;

  useEffect(() => {
    setVisibleCount(PUBLIC_MEDIA_PAGE_SIZE);
  }, [categoryFilter, sort]);

  if (videos.length === 0) return null;

  const controls = (
    <>
      <Select value={sort} onValueChange={(value) => setSort(value as PublicMediaSort)}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="مرتب‌سازی" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">ترتیب پیش‌فرض</SelectItem>
          <SelectItem value="title">عنوان</SelectItem>
          <SelectItem value="newest">جدیدترین</SelectItem>
        </SelectContent>
      </Select>
      {activeCategories.length > 0 && (
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
    </>
  );

  return (
    <CollapsibleSection
      id="videos"
      title="ویدیوها"
      description="در مودال پخش، نسخه‌های قبلی را هم ببینید"
      controls={controls}
    >
      {filteredVideos.length === 0 ? (
        <div className="rounded-xl border bg-card py-12 text-center text-muted-foreground">
          ویدیویی در این دسته یافت نشد.
        </div>
      ) : (
        <div className="space-y-4">
          <div className={PUBLIC_MEDIA_GRID_CLASS}>
            {visibleVideos.map((video) => (
              <VideoCard
                key={video.id}
                title={video.title}
                description={video.description}
                categoryTitle={video.category?.title}
                versions={video.versions}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((count) => count + PUBLIC_MEDIA_PAGE_SIZE)}
              >
                مشاهده بیشتر ({formatPersianNumber(filteredVideos.length - visibleCount)} باقی‌مانده)
              </Button>
            </div>
          )}
        </div>
      )}
    </CollapsibleSection>
  );
}
