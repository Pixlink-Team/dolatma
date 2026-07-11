"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminPosterAddCard, AdminPosterCompactCard } from "@/components/admin/admin-poster-compact-card";
import { AdminMediaCategories } from "@/components/admin/admin-media-categories";
import { AdminPosterEditor } from "@/components/admin/admin-poster-editor";
import {
  AdminContentFilterBar,
  collectAdminFilterUsers,
  DEFAULT_ADMIN_CONTENT_FILTER,
  matchesAdminContentFilter,
  type AdminContentFilterState,
} from "@/components/admin/admin-content-filter-bar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ContentTopic } from "@/lib/content-topics";
import type { MediaCategory, Poster, PosterVersion } from "@/lib/types";

interface PostersAdminProps {
  campaignId: string;
  initialCategories: MediaCategory[];
  initialPosters: Poster[];
  initialVersions: PosterVersion[];
  contentPlans?: string[];
  contentTopics?: ContentTopic[];
  canScore?: boolean;
}

const editorDialogClass =
  "!flex min-h-0 max-h-[92vh] max-w-2xl flex-col gap-0 overflow-hidden p-0";

export function PostersAdmin({
  campaignId,
  initialCategories,
  initialPosters,
  initialVersions,
  contentPlans = [],
  contentTopics = [],
  canScore = false,
}: PostersAdminProps) {
  const router = useRouter();
  const [posters, setPosters] = useState(initialPosters);
  const [versions, setVersions] = useState(initialVersions);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activePosterId, setActivePosterId] = useState<string | null>(null);
  const [draftPoster, setDraftPoster] = useState<Poster | null>(null);
  const [contentFilter, setContentFilter] = useState<AdminContentFilterState>(DEFAULT_ADMIN_CONTENT_FILTER);
  const [isPending] = useTransition();

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

  const filterUsers = useMemo(() => collectAdminFilterUsers(posters), [posters]);
  const filteredPosters = useMemo(
    () => posters.filter((item) => matchesAdminContentFilter(item, contentFilter)),
    [posters, contentFilter]
  );

  const activePoster = useMemo(() => {
    if (!activePosterId) return null;
    if (draftPoster?.id === activePosterId) return draftPoster;
    return posters.find((poster) => poster.id === activePosterId) ?? null;
  }, [activePosterId, draftPoster, posters]);

  const isDraftPoster = Boolean(draftPoster && activePosterId === draftPoster.id);
  const activeVersions = activePosterId ? versionsByPosterId.get(activePosterId) ?? [] : [];
  const refresh = () => router.refresh();

  const openEditor = (posterId: string) => {
    setActivePosterId(posterId);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setActivePosterId(null);
    setDraftPoster(null);
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
      planLabel: null,
      createdAt: now,
      updatedAt: now,
    };

    setDraftPoster(newPoster);
    openEditor(posterId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">پوسترها</h1>
        <p className="text-sm text-muted-foreground">
          نمای فشرده — روی کارت کلیک کنید یا با + پوستر جدید بسازید
        </p>
      </div>

      <AdminContentFilterBar
        filter={contentFilter}
        onChange={setContentFilter}
        users={filterUsers}
        plans={contentPlans}
      />

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
          {filteredPosters.map((poster) => (
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
                contentPlans={contentPlans}
                contentTopics={contentTopics}
                canScore={canScore}
                isNew={isDraftPoster}
                onClose={closeEditor}
                onSaved={(savedPoster) => {
                  setPosters((prev) => {
                    const exists = prev.some((item) => item.id === savedPoster.id);
                    return exists
                      ? prev.map((item) => (item.id === savedPoster.id ? savedPoster : item))
                      : [...prev, savedPoster];
                  });
                  setDraftPoster(null);
                  closeEditor();
                  refresh();
                }}
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
