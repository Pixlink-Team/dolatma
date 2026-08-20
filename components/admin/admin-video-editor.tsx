"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Upload, VideoIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MediaUpload } from "@/components/ui/media-upload";
import { VideoThumbnail } from "@/components/media/video-thumbnail";
import { PlanLabelSelect } from "@/components/admin/plan-label-select";
import {
  ADMIN_EDITOR_FOOTER_CLASS,
  ADMIN_EDITOR_SCROLL_CLASS,
  ADMIN_EDITOR_SCROLL_INNER_CLASS,
  AdminEditorDialogActions,
} from "@/components/admin/admin-editor-dialog";
import { ContentScoreControl } from "@/components/admin/content-score-control";
import {
  deleteVideoAction,
  deleteVideoVersionAction,
  saveVideoAction,
  saveVideoVersionAction,
} from "@/lib/actions/admin-actions";
import { normalizePlanLabels, type ContentTopic } from "@/lib/content-topics";
import { CONTENT_TITLE_MAX_LENGTH } from "@/lib/content-constraints";
import {
  isDefaultVideoTitle,
  type EditSuggestionMissingField,
} from "@/lib/edit-suggestions";
import { todayISO } from "@/lib/jalali";
import {
  buildVideoVersionMedia,
  resolveDisplayVersion,
  resolveVideoThumbnail,
} from "@/lib/media-utils";
import type { MediaCategory, Video, VideoVersion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { pickDefaultVideoCategoryId, videoTypeSelectOptions } from "@/lib/video-types";

interface AdminVideoEditorProps {
  video: Video;
  versions: VideoVersion[];
  categories: MediaCategory[];
  contentPlans?: string[];
  contentTopics?: ContentTopic[];
  canScore?: boolean;
  isNew?: boolean;
  highlightFields?: EditSuggestionMissingField[];
  onClose: () => void;
  onSaved?: (video: Video) => void;
}

function draftCoverFromVersion(version: VideoVersion): string {
  if (version.thumbnailUrl === version.videoUrl) return "";
  return version.thumbnailUrl ?? "";
}

function formatVideoDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function getActionErrorMessage(result: unknown, fallback: string): string {
  if (result && typeof result === "object" && "error" in result) {
    const message = (result as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function readVideoDuration(file: File): Promise<string> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const nextDuration = Number.isFinite(video.duration) ? formatVideoDuration(video.duration) : "";
      cleanup();
      resolve(nextDuration);
    };
    video.onerror = () => {
      cleanup();
      resolve("");
    };
    video.src = objectUrl;
  });
}

export function AdminVideoEditor({
  video,
  versions,
  categories,
  contentPlans = [],
  contentTopics = [],
  canScore = false,
  isNew = false,
  highlightFields = [],
  onClose,
  onSaved,
}: AdminVideoEditorProps) {
  const router = useRouter();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const displayVersion = useMemo(() => resolveDisplayVersion(versions), [versions]);

  const [videoUrl, setVideoUrl] = useState(displayVersion?.videoUrl || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(
    displayVersion ? draftCoverFromVersion(displayVersion) : ""
  );
  const [duration, setDuration] = useState(displayVersion?.duration ?? "");
  const [editTitle, setEditTitle] = useState(video.title);
  const [editDescription, setEditDescription] = useState(video.description ?? "");
  const [editCategoryId, setEditCategoryId] = useState(
    () => video.categoryId || pickDefaultVideoCategoryId(categories)
  );
  const [editPlanLabels, setEditPlanLabels] = useState<string[]>(() =>
    normalizePlanLabels(video.planLabels, video.planLabel)
  );
  const [editScore, setEditScore] = useState<number | null | undefined>(video.score);

  const typeOptions = useMemo(() => videoTypeSelectOptions(categories), [categories]);
  const selectOptions = useMemo(() => {
    if (!editCategoryId) return typeOptions;
    if (typeOptions.some((category) => category.id === editCategoryId)) return typeOptions;
    const current = categories.find((category) => category.id === editCategoryId);
    return current ? [current, ...typeOptions] : typeOptions;
  }, [categories, editCategoryId, typeOptions]);

  useEffect(() => {
    const current = resolveDisplayVersion(versions);
    setEditTitle(video.title);
    setEditDescription(video.description ?? "");
    setEditCategoryId(video.categoryId || pickDefaultVideoCategoryId(categories));
    setEditPlanLabels(normalizePlanLabels(video.planLabels, video.planLabel));
    setEditScore(video.score);
    setVideoUrl(current?.videoUrl || "");
    setThumbnailUrl(current ? draftCoverFromVersion(current) : "");
    setDuration(current?.duration ?? "");
    // Only re-seed when switching videos — unstable versions[] would wipe in-progress uploads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id]);

  const previewCover = videoUrl
    ? resolveVideoThumbnail(videoUrl, thumbnailUrl || undefined)
    : null;

  const refresh = () => router.refresh();

  const handleSaveAll = () => {
    if (!editCategoryId) {
      toast.error("نوع ویدیو را انتخاب کنید");
      return;
    }
    if (!videoUrl.trim()) {
      toast.error("ویدیو لازم است");
      return;
    }
    if (editPlanLabels.length === 0) {
      toast.error("موضوع الزامی است");
      return;
    }

    startTransition(async () => {
      const savedVideo = {
        ...video,
        title: editTitle,
        description: editDescription,
        categoryId: editCategoryId,
        published: true,
        planLabels: editPlanLabels,
        planLabel: editPlanLabels[0] ?? null,
        score: editScore,
        updatedAt: new Date().toISOString(),
      };

      const videoResult = await saveVideoAction(savedVideo);
      if (!videoResult?.success) {
        toast.error(getActionErrorMessage(videoResult, "ذخیره ویدیو ناموفق بود"));
        return;
      }

      const media = buildVideoVersionMedia(videoUrl, thumbnailUrl);
      const keepId = displayVersion?.id;
      const versionResult = await saveVideoVersionAction({
        id: keepId,
        videoId: video.id,
        versionNumber: displayVersion?.versionNumber ?? 1,
        videoUrl: media.videoUrl,
        thumbnailUrl: media.thumbnailUrl,
        duration: duration || undefined,
        notes: displayVersion?.notes || undefined,
        date: displayVersion?.date ?? todayISO(),
        isFinal: true,
        status: "final",
      });
      if (!versionResult?.success) {
        toast.error(getActionErrorMessage(versionResult, "ذخیره نسخه ویدیو ناموفق بود"));
        return;
      }

      for (const version of versions) {
        if (version.id !== keepId) {
          const deleteResult = await deleteVideoVersionAction(version.id);
          if (!deleteResult?.success) {
            toast.error("حذف نسخه قبلی ناموفق بود");
            return;
          }
        }
      }

      toast.success("ذخیره شد");
      onSaved?.(savedVideo);
      refresh();
    });
  };

  const handleDeleteVideo = () => {
    if (isNew) {
      onClose();
      return;
    }
    setConfirmDeleteOpen(true);
  };

  const confirmDeleteVideo = () => {
    setConfirmDeleteOpen(false);
    startTransition(async () => {
      const result = await deleteVideoAction(video.id);
      if (!result?.success) {
        toast.error(getActionErrorMessage(result, "حذف ویدیو ناموفق بود"));
        return;
      }
      toast.success("ویدیو حذف شد");
      onClose();
      refresh();
    });
  };

  const highlightTitle =
    highlightFields.includes("title") &&
    (isDefaultVideoTitle(editTitle) || !editTitle.trim());
  const highlightDescription =
    highlightFields.includes("description") && !editDescription.trim();
  const highlightMedia = highlightFields.includes("media") && !videoUrl.trim();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollAreaRef} className={ADMIN_EDITOR_SCROLL_CLASS}>
        <div className={ADMIN_EDITOR_SCROLL_INNER_CLASS}>
          <MediaUpload
            label="ویدیو"
            kind="video"
            fileOnly
            value={videoUrl}
            onChange={setVideoUrl}
            onUploadedFile={(file) => {
              void readVideoDuration(file).then((nextDuration) => {
                if (nextDuration) setDuration(nextDuration);
              });
            }}
            coverImageUrl={thumbnailUrl}
            onAutoCoverGenerated={(coverUrl) => {
              setThumbnailUrl((current) => (current.trim() ? current : coverUrl));
            }}
            accept="video/mp4,video/webm,video/quicktime"
            showPreview={false}
            showLinkInput={false}
            dropzoneContent={
              <div
                className={cn(
                  "relative aspect-video w-full overflow-hidden rounded-[10px] bg-muted",
                  highlightMedia && "ring-2 ring-destructive ring-offset-2"
                )}
              >
                {videoUrl ? (
                  previewCover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewCover} alt={editTitle} className="h-full w-full object-contain" />
                  ) : (
                    <VideoThumbnail
                      videoUrl={videoUrl}
                      thumbnailUrl={thumbnailUrl || undefined}
                      alt={editTitle}
                      className="object-contain"
                    />
                  )
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-sm text-muted-foreground">
                    <VideoIcon className="h-10 w-10" />
                    <span className="text-sm">ویدیو را بکشید و رها کنید یا انتخاب کنید</span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                      <Upload className="h-3.5 w-3.5" />
                      انتخاب ویدیو
                    </span>
                  </div>
                )}
                {videoUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play className="h-12 w-12 text-white" />
                  </div>
                ) : null}
              </div>
            }
          />

          <div className="space-y-3">
            <div>
              <Label className={cn(highlightTitle && "text-destructive")}>عنوان</Label>
              <Input
                value={editTitle}
                maxLength={CONTENT_TITLE_MAX_LENGTH}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="عنوان ویدیو"
                className={cn(highlightTitle && "border-destructive focus-visible:ring-destructive")}
              />
              {highlightTitle && (
                <p className="mt-1 text-xs text-destructive">عنوان پیش‌فرض است؛ یک عنوان اختصاصی وارد کنید.</p>
              )}
            </div>
            <PlanLabelSelect
              topics={contentTopics}
              plans={contentPlans}
              values={editPlanLabels}
              onChangeMultiple={setEditPlanLabels}
            />
            <div>
              <Label className={cn(highlightDescription && "text-amber-700 dark:text-amber-300")}>توضیحات</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                placeholder="توضیحات (اختیاری)"
                className={cn(
                  highlightDescription && "border-amber-500 focus-visible:ring-amber-500"
                )}
              />
              {highlightDescription && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">توضیحات خالی است؛ بهتر است تکمیل شود.</p>
              )}
            </div>
            <div>
              <Label>نوع ویدیو</Label>
              <Select
                value={editCategoryId || undefined}
                onValueChange={setEditCategoryId}
                disabled={selectOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="تیزر، انیمیشن یا موشن‌گرافیک" />
                </SelectTrigger>
                <SelectContent>
                  {selectOptions.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isNew && (
              <ContentScoreControl
                campaignId={video.campaignId}
                contentType="video"
                contentId={video.id}
                score={editScore}
                canScore={canScore}
                onScoreSaved={setEditScore}
              />
            )}
            {highlightMedia && (
              <p className="text-xs text-destructive">ویدیو هنوز آپلود نشده است.</p>
            )}
            <MediaUpload
              label="کاور سفارشی (اختیاری — بدون کاور، خودکار از ویدیو ساخته می‌شود)"
              value={thumbnailUrl}
              onChange={setThumbnailUrl}
              dropzone={false}
              showPreview={false}
            />
          </div>
        </div>
      </div>

      <div className={ADMIN_EDITOR_FOOTER_CLASS}>
        <AdminEditorDialogActions
          onSave={handleSaveAll}
          isPending={isPending}
          onDelete={handleDeleteVideo}
          deleteLabel={isNew ? "بستن" : "حذف ویدیو"}
        />
      </div>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف ویدیو</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف «{editTitle || "این ویدیو"}» مطمئن هستید؟ این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteVideo}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
