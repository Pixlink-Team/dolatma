"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { History, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MediaUpload } from "@/components/ui/media-upload";
import { MediaThumbnail } from "@/components/ui/media-thumbnail";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deletePosterAction,
  deletePosterVersionAction,
  savePosterAction,
  savePosterVersionAction,
} from "@/lib/actions/admin-actions";
import { todayISO } from "@/lib/jalali";
import type { MediaCategory, Poster, PosterVersion } from "@/lib/types";
import { formatPersianDate, formatPersianNumber, getStatusLabel } from "@/lib/utils";

interface PendingPosterVersion {
  localId: string;
  imageUrl: string;
  notes: string;
}

interface AdminPosterEditorProps {
  poster: Poster;
  versions: PosterVersion[];
  categories: MediaCategory[];
  onClose: () => void;
}

function createPendingVersion(): PendingPosterVersion {
  return { localId: crypto.randomUUID(), imageUrl: "", notes: "" };
}

export function AdminPosterEditor({
  poster,
  versions,
  categories,
  onClose,
}: AdminPosterEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [pendingVersions, setPendingVersions] = useState<PendingPosterVersion[]>([createPendingVersion()]);
  const [editTitle, setEditTitle] = useState(poster.title);
  const [editDescription, setEditDescription] = useState(poster.description ?? "");
  const [editCategoryId, setEditCategoryId] = useState(poster.categoryId);

  useEffect(() => {
    setEditTitle(poster.title);
    setEditDescription(poster.description ?? "");
    setEditCategoryId(poster.categoryId);
  }, [poster.id, poster.title, poster.description, poster.categoryId]);

  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const latestVersion = sortedVersions[0];
  const nextVersionNumber = (sortedVersions[0]?.versionNumber ?? 0) + 1;

  const refresh = () => router.refresh();

  const handleSavePoster = () => {
    startTransition(async () => {
      await savePosterAction({
        ...poster,
        title: editTitle,
        description: editDescription,
        categoryId: editCategoryId,
      });
      toast.success("ذخیره شد");
      refresh();
    });
  };

  const handleTogglePublish = (published: boolean) => {
    startTransition(async () => {
      await savePosterAction({ ...poster, published });
      toast.success(published ? "منتشر شد" : "از انتشار خارج شد");
      refresh();
    });
  };

  const handleDeletePoster = () => {
    startTransition(async () => {
      await deletePosterAction(poster.id);
      toast.success("پوستر حذف شد");
      onClose();
      refresh();
    });
  };

  const handleDeleteVersion = (versionId: string) => {
    startTransition(async () => {
      await deletePosterVersionAction(versionId);
      toast.success("نسخه حذف شد");
      refresh();
    });
  };

  const updatePendingVersion = (localId: string, patch: Partial<PendingPosterVersion>) => {
    setPendingVersions((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, ...patch } : item))
    );
  };

  const handleSaveAllVersions = () => {
    const validVersions = pendingVersions.filter((item) => item.imageUrl.trim());
    if (validVersions.length === 0) {
      toast.error("حداقل یک تصویر برای ذخیره نسخه‌ها لازم است");
      return;
    }

    startTransition(async () => {
      for (const item of validVersions) {
        await savePosterVersionAction({
          posterId: poster.id,
          imageUrl: item.imageUrl,
          thumbnailUrl: item.imageUrl,
          notes: item.notes || undefined,
          date: todayISO(),
        });
      }

      setPendingVersions([createPendingVersion()]);
      toast.success(`${formatPersianNumber(validVersions.length)} نسخه ذخیره شد`);
      refresh();
    });
  };

  return (
    <>
      <div className="space-y-4 pt-2">
        <div className="relative mx-auto aspect-[3/4] max-h-80 w-full max-w-xs overflow-hidden rounded-xl bg-muted">
          {latestVersion ? (
            <MediaThumbnail
              src={latestVersion.imageUrl}
              alt={editTitle}
              kind="poster"
              sizes="320px"
            />
          ) : (
            <MediaThumbnail src={null} alt={editTitle} kind="poster" />
          )}
          <div className="absolute top-2 right-2 flex flex-wrap gap-1">
            {latestVersion ? (
              <>
                <Badge variant="outline">نسخه {formatPersianNumber(latestVersion.versionNumber)}</Badge>
                {latestVersion.isFinal && <Badge status="final">نسخه نهایی</Badge>}
              </>
            ) : (
              <Badge variant="secondary">بدون نسخه</Badge>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-3">
            <div>
              <Label>عنوان</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="عنوان پوستر" />
            </div>
            <div>
              <Label>توضیحات</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                placeholder="توضیحات (اختیاری)"
              />
            </div>
            <div>
              <Label>دسته</Label>
              <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                <SelectTrigger><SelectValue placeholder="دسته" /></SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={handleSavePoster} disabled={isPending} className="w-full">
                ذخیره اطلاعات
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setVersionsOpen(true)}
                disabled={isPending}
                className="w-full gap-1.5"
              >
                <History className="h-4 w-4" />
                نسخه‌ها ({formatPersianNumber(sortedVersions.length)})
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 pt-6">
            <Switch checked={poster.published} onCheckedChange={handleTogglePublish} />
            <Button variant="ghost" size="icon" onClick={handleDeletePoster} disabled={isPending}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>نسخه‌های {editTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {sortedVersions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">نسخه‌های موجود</p>
                <div className="grid gap-2">
                  {sortedVersions.map((version) => (
                    <div key={version.id} className="flex items-center gap-3 rounded-lg border bg-background p-2">
                      <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded bg-muted">
                        <MediaThumbnail src={version.thumbnailUrl || version.imageUrl} alt="" kind="poster" sizes="48px" />
                      </div>
                      <div className="min-w-0 flex-1 text-right">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium">نسخه {formatPersianNumber(version.versionNumber)}</span>
                          <Badge status={version.status} className="text-[10px]">{getStatusLabel(version.status)}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{formatPersianDate(version.date)}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteVersion(version.id)} disabled={isPending}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">افزودن نسخه‌های جدید</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingVersions((prev) => [...prev, createPendingVersion()])}
                  className="gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  ردیف جدید
                </Button>
              </div>

              {pendingVersions.map((pending, index) => (
                <div key={pending.localId} className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      نسخه {formatPersianNumber(nextVersionNumber + index)}
                    </p>
                    {pendingVersions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          setPendingVersions((prev) => prev.filter((item) => item.localId !== pending.localId))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <MediaUpload
                    label="تصویر"
                    value={pending.imageUrl}
                    onChange={(url) => updatePendingVersion(pending.localId, { imageUrl: url })}
                  />
                  <div>
                    <Label>یادداشت (اختیاری)</Label>
                    <Textarea
                      value={pending.notes}
                      onChange={(e) => updatePendingVersion(pending.localId, { notes: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              ))}

              <Button onClick={handleSaveAllVersions} disabled={isPending} className="w-full">
                {isPending ? "در حال ذخیره..." : "ذخیره نسخه‌ها"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
