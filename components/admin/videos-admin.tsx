"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminVideoAddCard, AdminVideoCompactCard } from "@/components/admin/admin-video-compact-card";
import { AdminMediaCategories } from "@/components/admin/admin-media-categories";
import { AdminVideoEditor } from "@/components/admin/admin-video-editor";
import { saveVideoAction } from "@/lib/actions/admin-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MediaCategory, Video, VideoVersion } from "@/lib/types";

interface VideosAdminProps {
  campaignId: string;
  initialCategories: MediaCategory[];
  initialVideos: Video[];
  initialVersions: VideoVersion[];
}

const editorDialogClass =
  "!flex min-h-0 max-h-[92vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 !top-4 !translate-x-[-50%] !translate-y-0 sm:!top-6";

export function VideosAdmin({
  campaignId,
  initialCategories,
  initialVideos,
  initialVersions,
}: VideosAdminProps) {
  const router = useRouter();
  const [videos, setVideos] = useState(initialVideos);
  const [versions, setVersions] = useState(initialVersions);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setVideos(initialVideos);
    setVersions(initialVersions);
  }, [initialVideos, initialVersions]);

  const versionsByVideoId = useMemo(() => {
    const map = new Map<string, VideoVersion[]>();
    for (const version of versions) {
      const list = map.get(version.videoId) ?? [];
      list.push(version);
      map.set(version.videoId, list);
    }
    return map;
  }, [versions]);

  const activeVideo = activeVideoId
    ? videos.find((video) => video.id === activeVideoId) ?? null
    : null;

  const activeVersions = activeVideoId ? versionsByVideoId.get(activeVideoId) ?? [] : [];

  const refresh = () => router.refresh();

  useEffect(() => {
    if (editorOpen) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [editorOpen]);

  const openEditor = (videoId: string) => {
    setActiveVideoId(videoId);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setActiveVideoId(null);
  };

  const handleCreateVideo = () => {
    if (initialCategories.length === 0) {
      toast.error("ابتدا یک دسته بسازید");
      return;
    }

    const videoId = crypto.randomUUID();
    const categoryId = initialCategories[0].id;
    const now = new Date().toISOString();
    const newVideo: Video = {
      id: videoId,
      campaignId,
      categoryId,
      title: `ویدیو ${videos.length + 1}`,
      description: "",
      published: false,
      sortOrder: videos.length + 1,
      createdAt: now,
      updatedAt: now,
    };

    startTransition(async () => {
      const result = await saveVideoAction(newVideo);
      if (!result.success) {
        toast.error("ایجاد ویدیو ناموفق بود");
        return;
      }

      setVideos((prev) => [...prev, newVideo]);
      openEditor(videoId);
      toast.success("ویدیو جدید — فایل را آپلود کنید");
      refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ویدیوها</h1>
        <p className="text-sm text-muted-foreground">
          نمای فشرده — روی کارت کلیک کنید یا با + ویدیو جدید بسازید
        </p>
      </div>

      <AdminMediaCategories
        campaignId={campaignId}
        type="video"
        categories={initialCategories}
        label="ویدیو"
      />

      {initialCategories.length === 0 ? (
        <div className="rounded-xl border py-12 text-center text-muted-foreground">
          ابتدا یک دسته‌بندی بسازید.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {videos.map((video) => (
            <AdminVideoCompactCard
              key={video.id}
              video={video}
              versions={versionsByVideoId.get(video.id) ?? []}
              onClick={() => openEditor(video.id)}
            />
          ))}
          <AdminVideoAddCard onClick={handleCreateVideo} disabled={isPending} />
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={(open) => (open ? setEditorOpen(true) : closeEditor())}>
        <DialogContent className={editorDialogClass}>
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
            <DialogTitle>{activeVideo?.title ?? "ویرایش ویدیو"}</DialogTitle>
            <DialogDescription className="sr-only">
              ویرایش عنوان، دسته، نسخه‌ها و وضعیت انتشار ویدیو
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-4 pt-4">
            {activeVideo ? (
              <AdminVideoEditor
                video={activeVideo}
                versions={activeVersions}
                categories={initialCategories}
                onClose={closeEditor}
              />
            ) : (
              <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
                در حال بارگذاری...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
