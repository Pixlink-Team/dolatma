"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminPosterAddCard, AdminPosterCompactCard } from "@/components/admin/admin-poster-compact-card";
import { AdminMediaCategories } from "@/components/admin/admin-media-categories";
import { AdminPosterEditor } from "@/components/admin/admin-poster-editor";
import { savePosterAction } from "@/lib/actions/admin-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MediaCategory, Poster, PosterVersion } from "@/lib/types";

interface PostersAdminProps {
  campaignId: string;
  initialCategories: MediaCategory[];
  initialPosters: Poster[];
  initialVersions: PosterVersion[];
}

const editorDialogClass =
  "!flex min-h-0 max-h-[92vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 !top-4 !translate-x-[-50%] !translate-y-0 sm:!top-6";

export function PostersAdmin({
  campaignId,
  initialCategories,
  initialPosters,
  initialVersions,
}: PostersAdminProps) {
  const router = useRouter();
  const [posters, setPosters] = useState(initialPosters);
  const [versions, setVersions] = useState(initialVersions);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activePosterId, setActivePosterId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPosters(initialPosters);
    setVersions(initialVersions);
  }, [initialPosters, initialVersions]);

  const versionsByPosterId = useMemo(() => {
    const map = new Map<string, PosterVersion[]>();
    for (const version of versions) {
      const list = map.get(version.posterId) ?? [];
      list.push(version);
      map.set(version.posterId, list);
    }
    return map;
  }, [versions]);

  const activePoster = activePosterId
    ? posters.find((poster) => poster.id === activePosterId) ?? null
    : null;

  const activeVersions = activePosterId ? versionsByPosterId.get(activePosterId) ?? [] : [];

  const refresh = () => router.refresh();

  useEffect(() => {
    if (editorOpen) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [editorOpen]);

  const openEditor = (posterId: string) => {
    setActivePosterId(posterId);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setActivePosterId(null);
  };

  const handleCreatePoster = () => {
    if (initialCategories.length === 0) {
      toast.error("ابتدا یک دسته بسازید");
      return;
    }

    const posterId = crypto.randomUUID();
    const categoryId = initialCategories[0].id;
    const now = new Date().toISOString();
    const newPoster: Poster = {
      id: posterId,
      campaignId,
      categoryId,
      title: `پوستر ${posters.length + 1}`,
      description: "",
      published: false,
      sortOrder: posters.length + 1,
      createdAt: now,
      updatedAt: now,
    };

    startTransition(async () => {
      const result = await savePosterAction(newPoster);
      if (!result.success) {
        toast.error("ایجاد پوستر ناموفق بود");
        return;
      }

      setPosters((prev) => [...prev, newPoster]);
      openEditor(posterId);
      toast.success("پوستر جدید — تصویر را آپلود کنید");
      refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">پوسترها</h1>
        <p className="text-sm text-muted-foreground">
          نمای فشرده — روی کارت کلیک کنید یا با + پوستر جدید بسازید
        </p>
      </div>

      <AdminMediaCategories
        campaignId={campaignId}
        type="poster"
        categories={initialCategories}
        label="پوستر"
      />

      {initialCategories.length === 0 ? (
        <div className="rounded-xl border py-12 text-center text-muted-foreground">
          ابتدا یک دسته‌بندی بسازید.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {posters.map((poster) => (
            <AdminPosterCompactCard
              key={poster.id}
              poster={poster}
              versions={versionsByPosterId.get(poster.id) ?? []}
              onClick={() => openEditor(poster.id)}
            />
          ))}
          <AdminPosterAddCard onClick={handleCreatePoster} disabled={isPending} />
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={(open) => (open ? setEditorOpen(true) : closeEditor())}>
        <DialogContent className={editorDialogClass}>
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
            <DialogTitle>{activePoster?.title ?? "ویرایش پوستر"}</DialogTitle>
            <DialogDescription className="sr-only">
              ویرایش عنوان، دسته، نسخه‌ها و وضعیت انتشار پوستر
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-4 pt-4">
            {activePoster ? (
              <AdminPosterEditor
                poster={activePoster}
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
