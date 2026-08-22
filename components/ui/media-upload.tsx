"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import {
  isAparatVideoInput,
  isDirectVideoUrl,
  isLocalUploadedFileUrl,
  resolveVideoEmbedUrl,
  resolveVideoThumbnail,
} from "@/lib/media-utils";
import { cn } from "@/lib/utils";
import {
  captureAndUploadVideoCover,
  captureAndUploadVideoCoverFromUrl,
  videoNeedsAutoCover,
} from "@/lib/client/video-cover";
import {
  optimizeImageFile,
  type OptimizeImageOptions,
} from "@/lib/client/optimize-image";
import { forceClientReauth, redirectIfSessionExpired } from "@/lib/auth/client-reauth";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type UploadKind = "image" | "video" | "audio" | "activity-video" | "raw-image" | "raw-video";

/** Keep in sync with app/api/upload/route.ts */
const DEFAULT_MAX_BYTES: Record<UploadKind, number> = {
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  "activity-video": 50 * 1024 * 1024,
  "raw-image": 100 * 1024 * 1024,
  "raw-video": 2 * 1024 * 1024 * 1024,
};

function formatMaxSizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    const gb = Math.round((bytes / (1024 * 1024 * 1024)) * 10) / 10;
    return `${gb} گیگابایت`;
  }
  const mb = Math.round(bytes / (1024 * 1024));
  return `${mb} مگابایت`;
}

function sizeLimitErrorMessage(bytes: number): string {
  return `حجم فایل نباید بیشتر از ${formatMaxSizeLabel(bytes)} باشد`;
}

interface MediaUploadProps {
  value: string;
  onChange: (url: string) => void;
  onUploaded?: (url: string) => void;
  onUploadedFile?: (file: File, url: string) => void;
  onUploadedMeta?: (meta: {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }) => void;
  /** Fired after a video upload when an auto WebP cover was generated from second ~3. */
  onAutoCoverGenerated?: (coverUrl: string) => void;
  /** When set, auto cover is skipped if this already has a value. */
  coverImageUrl?: string | null;
  onCoverImageUrlChange?: (url: string) => void;
  /** Auto-generate cover from second 3 for direct video uploads (default: true for video). */
  autoVideoCover?: boolean;
  /** Resize/compress images client-side before upload (logos, icons, etc.). */
  optimizeBeforeUpload?: boolean | OptimizeImageOptions;
  label?: string;
  kind?: "image" | "video" | "audio";
  uploadKind?: UploadKind;
  accept?: string;
  dropzone?: boolean;
  fileOnly?: boolean;
  maxFileSizeBytes?: number;
  dropzoneContent?: ReactNode;
  showPreview?: boolean;
  showLinkInput?: boolean;
}

export function MediaUpload({
  value,
  onChange,
  onUploaded,
  onUploadedFile,
  onUploadedMeta,
  onAutoCoverGenerated,
  coverImageUrl,
  onCoverImageUrlChange,
  autoVideoCover,
  optimizeBeforeUpload = false,
  label,
  kind = "image",
  uploadKind,
  accept,
  dropzone = true,
  fileOnly = false,
  maxFileSizeBytes,
  dropzoneContent,
  showPreview = true,
  showLinkInput = true,
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const processedVideoCoverRef = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const shouldAutoVideoCover = autoVideoCover ?? kind === "video";

  const applyGeneratedCover = useCallback(
    (coverUrl: string) => {
      if (!coverImageUrl?.trim()) {
        onCoverImageUrlChange?.(coverUrl);
      }
      onAutoCoverGenerated?.(coverUrl);
      toast.success("کاور از ثانیه ۳ ویدیو ساخته شد");
    },
    [coverImageUrl, onAutoCoverGenerated, onCoverImageUrlChange]
  );

  const tryGenerateCoverFromFile = async (file: File, videoUrl: string) => {
    if (!shouldAutoVideoCover || kind !== "video") return;
    if (!file.type.startsWith("video/")) return;
    if (!onAutoCoverGenerated && !onCoverImageUrlChange) return;
    if (coverImageUrl?.trim()) return;

    processedVideoCoverRef.current = videoUrl;
    setGeneratingCover(true);
    try {
      const coverUrl = await captureAndUploadVideoCover(file);
      applyGeneratedCover(coverUrl);
    } catch (error) {
      processedVideoCoverRef.current = null;
      console.warn("Auto video cover failed:", error);
    } finally {
      setGeneratingCover(false);
    }
  };

  useEffect(() => {
    if (!shouldAutoVideoCover || kind !== "video") return;
    if (!onAutoCoverGenerated && !onCoverImageUrlChange) return;

    const trimmed = value.trim();
    if (!trimmed || !isDirectVideoUrl(trimmed) || isAparatVideoInput(trimmed)) return;
    if (coverImageUrl?.trim()) return;
    if (!videoNeedsAutoCover(trimmed, coverImageUrl)) return;
    if (processedVideoCoverRef.current === trimmed) return;

    let cancelled = false;
    processedVideoCoverRef.current = trimmed;
    setGeneratingCover(true);

    void captureAndUploadVideoCoverFromUrl(trimmed)
      .then((coverUrl) => {
        if (cancelled) return;
        applyGeneratedCover(coverUrl);
      })
      .catch((error) => {
        processedVideoCoverRef.current = null;
        console.warn("Auto video cover from URL failed:", error);
      })
      .finally(() => {
        if (!cancelled) setGeneratingCover(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    value,
    kind,
    shouldAutoVideoCover,
    coverImageUrl,
    onAutoCoverGenerated,
    onCoverImageUrlChange,
    applyGeneratedCover,
  ]);

  const resolveUploadKind = (file: File): UploadKind => {
    if (uploadKind) return uploadKind;

    const acceptLower = (accept ?? "").toLowerCase();
    const acceptAllowsVideo = acceptLower.includes("video") || kind === "video";
    const acceptAllowsAudio = acceptLower.includes("audio") || kind === "audio";
    const acceptAllowsImage = acceptLower.includes("image") || kind === "image" || !accept;

    if (file.type.startsWith("video/") && acceptAllowsVideo) return "video";
    if (file.type.startsWith("audio/") && acceptAllowsAudio) return "audio";
    if (file.type.startsWith("image/") && acceptAllowsImage) return "image";

    // Extension fallback when browser leaves MIME empty (common for some .mov/.mp4 files)
    if (acceptAllowsVideo && /\.(mp4|webm|mov|m4v)$/i.test(file.name)) return "video";
    if (acceptAllowsAudio && /\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(file.name)) return "audio";
    if (acceptAllowsImage && /\.(jpe?g|png|webp|gif)$/i.test(file.name)) return "image";

    return kind;
  };

  const resolveMaxBytesForKind = (resolvedKind: UploadKind): number => {
    if (typeof maxFileSizeBytes === "number" && maxFileSizeBytes > 0) {
      return maxFileSizeBytes;
    }
    return DEFAULT_MAX_BYTES[resolvedKind];
  };

  const handleUpload = async (file: File) => {
    const resolvedKind = resolveUploadKind(file);
    const effectiveMaxBytes = resolveMaxBytesForKind(resolvedKind);
    if (file.size > effectiveMaxBytes) {
      toast.error(sizeLimitErrorMessage(effectiveMaxBytes));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      let uploadFile = file;
      if (
        optimizeBeforeUpload &&
        resolvedKind === "image" &&
        file.type.startsWith("image/")
      ) {
        const optimizeOptions =
          typeof optimizeBeforeUpload === "object" ? optimizeBeforeUpload : undefined;
        try {
          uploadFile = await optimizeImageFile(file, optimizeOptions);
        } catch (error) {
          console.warn("Image optimization failed, uploading original:", error);
        }
      }

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("kind", resolvedKind);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        if (response.status === 401) {
          forceClientReauth();
          return;
        }
        if (redirectIfSessionExpired(body?.error)) return;
        throw new Error(body?.error ?? "آپلود ناموفق بود");
      }

      const data = (await response.json()) as {
        url: string;
        fileName?: string;
        fileSize?: number;
        mimeType?: string;
      };
      onChange(data.url);
      onUploaded?.(data.url);
      onUploadedFile?.(uploadFile, data.url);
      onUploadedMeta?.({
        url: data.url,
        fileName: data.fileName ?? uploadFile.name,
        fileSize: data.fileSize ?? uploadFile.size,
        mimeType: data.mimeType ?? uploadFile.type,
      });
      setShowLinkEditor(false);
      toast.success(
        uploadFile !== file && uploadFile.size < file.size
          ? "تصویر آپلود و بهینه شد"
          : "فایل با موفقیت آپلود شد"
      );

      if (
        (resolvedKind === "video" || kind === "video") &&
        (file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file.name))
      ) {
        await tryGenerateCoverFromFile(file, data.url);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "آپلود ناموفق بود");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleUpload(file);
  };

  const placeholder =
    kind === "video"
      ? fileOnly
        ? "فایل ویدیو را آپلود کنید یا لینک مستقیم وارد کنید"
        : "کد embed آپارات را اینجا paste کنید، یا لینک/فایل ویدیو"
      : kind === "audio"
        ? "فایل صوتی را آپلود کنید یا لینک مستقیم وارد کنید"
        : "تصویر را بکشید و رها کنید یا لینک وارد کنید";

  const isDirectVideo = kind === "video" && Boolean(value) && isDirectVideoUrl(value);
  const isAparat = kind === "video" && Boolean(value) && isAparatVideoInput(value);
  const videoPreviewUrl = kind === "video" ? resolveVideoThumbnail(value) : null;
  const aparatEmbedUrl = isAparat ? resolveVideoEmbedUrl(value) : "";
  // Hide raw /api/files URL once a playable uploaded video is set.
  const hideVideoLinkField = isDirectVideo && !showLinkEditor && !fileOnly;
  const isLocalUploadedImage =
    kind === "image" && Boolean(value) && isLocalUploadedFileUrl(value);
  const hideImageLinkField = isLocalUploadedImage && !showLinkEditor;
  // Single card: preview + drag/select in one area (poster-style), unless custom dropzoneContent.
  const useBuiltInImageCard = kind === "image" && dropzone && !dropzoneContent;
  const showInlineInput = showLinkInput && !dropzoneContent && !useBuiltInImageCard;
  const isCardDropzone = Boolean(dropzoneContent) || useBuiltInImageCard;
  const showSeparateImagePreview = showPreview && kind === "image" && !isCardDropzone;

  const builtInImageCard = (
    <div className="relative min-h-40 w-full overflow-hidden rounded-[10px] bg-muted sm:min-h-48">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-full min-h-40 w-full object-contain sm:min-h-48" />
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 px-3 py-8 text-center text-muted-foreground sm:min-h-48">
          <ImageIcon className="h-10 w-10" />
          <span className="text-sm">تصویر را بکشید و رها کنید یا انتخاب کنید</span>
          <span className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
            <Upload className="h-3.5 w-3.5" />
            انتخاب تصویر
          </span>
        </div>
      )}
      {value ? (
        <div
          className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-8"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            تعویض
          </Button>
          {showLinkInput ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8"
              onClick={() => setShowLinkEditor((current) => !current)}
            >
              {showLinkEditor ? "پنهان لینک" : "لینک"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 text-destructive"
            onClick={() => {
              onChange("");
              setShowLinkEditor(false);
            }}
          >
            <Trash2 className="h-4 w-4" />
            حذف
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-2 text-right" dir="rtl">
      {label && <Label>{label}</Label>}

      <div
        role={isCardDropzone ? "button" : undefined}
        tabIndex={isCardDropzone ? 0 : undefined}
        onClick={
          isCardDropzone
            ? () => {
                if (uploading || generatingCover) return;
                inputRef.current?.click();
              }
            : undefined
        }
        onKeyDown={
          isCardDropzone
            ? (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                if (uploading || generatingCover) return;
                inputRef.current?.click();
              }
            : undefined
        }
        onDragOver={(event) => {
          if (!dropzone) return;
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={dropzone ? handleDrop : undefined}
        className={cn(
          "rounded-xl border-2 border-dashed transition-colors",
          isCardDropzone
            ? "relative w-full cursor-pointer overflow-hidden p-0"
            : "p-3",
          dropzone && isDragging && "border-primary bg-primary/5",
          !dropzone && "border-transparent p-0"
        )}
      >
        {isCardDropzone ? (
          <div className="relative w-full">
            {dropzoneContent ?? builtInImageCard}
            {(uploading || generatingCover) && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        ) : null}

        {!isCardDropzone && showInlineInput && kind === "video" && !fileOnly ? (
          hideVideoLinkField ? null : (
            <Textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData("text");
                if (!pasted.includes("aparat.com")) return;
                event.preventDefault();
                onChange(pasted.trim());
                setShowLinkEditor(false);
              }}
              dir="ltr"
              placeholder={placeholder}
              rows={4}
              className="min-h-24 font-mono text-xs"
            />
          )
        ) : !isCardDropzone && showInlineInput && hideImageLinkField ? null : !isCardDropzone && showInlineInput ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            {!(kind === "video" && isDirectVideo && fileOnly) && (
              <Input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                dir="ltr"
                placeholder={placeholder}
                className="flex-1"
              />
            )}
            <Button
              type="button"
              variant="outline"
              disabled={uploading || generatingCover}
              onClick={() => inputRef.current?.click()}
              className="shrink-0"
            >
              {uploading || generatingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {kind === "video" && fileOnly ? "آپلود ویدیو" : dropzone ? "انتخاب فایل" : "آپلود"}
            </Button>
          </div>
        ) : null}

        {!isCardDropzone && kind === "audio" && (
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              آپلود فایل صوتی
            </Button>
          </div>
        )}

        {!isCardDropzone && kind === "video" && fileOnly && !showInlineInput && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading || generatingCover}
              onClick={() => inputRef.current?.click()}
            >
              {uploading || generatingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {value ? "تعویض ویدیو" : "آپلود ویدیو"}
            </Button>
            {generatingCover && (
              <span className="text-xs text-muted-foreground">در حال ساخت کاور از ثانیه ۳…</span>
            )}
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  onChange("");
                  setShowLinkEditor(false);
                }}
              >
                <Trash2 className="h-4 w-4" />
                حذف ویدیو
              </Button>
            ) : null}
          </div>
        )}

        {!isCardDropzone && kind === "image" && (isLocalUploadedImage || !showInlineInput) && (
          <div className={cn("flex flex-wrap items-center gap-2", hideImageLinkField ? "mt-0" : "mt-2")}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {value ? "تعویض تصویر" : "انتخاب تصویر"}
            </Button>
            {showLinkInput && value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowLinkEditor((current) => !current)}
              >
                {showLinkEditor ? "پنهان کردن لینک" : "نمایش لینک"}
              </Button>
            ) : null}
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  onChange("");
                  setShowLinkEditor(false);
                }}
              >
                <Trash2 className="h-4 w-4" />
                حذف تصویر
              </Button>
            ) : null}
          </div>
        )}

        {!isCardDropzone && kind === "video" && !fileOnly && (
          <div className={cn("flex flex-wrap items-center gap-2", hideVideoLinkField ? "mt-0" : "mt-2")}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading || generatingCover}
              onClick={() => inputRef.current?.click()}
            >
              {uploading || generatingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isDirectVideo ? "تعویض فایل" : "آپلود فایل"}
            </Button>
            {generatingCover && (
              <span className="text-xs text-muted-foreground">در حال ساخت کاور از ثانیه ۳…</span>
            )}
            {isDirectVideo && (
              <>
                {showLinkInput ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLinkEditor((current) => !current)}
                  >
                    {showLinkEditor ? "پنهان کردن لینک" : "نمایش لینک"}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    onChange("");
                    setShowLinkEditor(false);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  حذف ویدیو
                </Button>
              </>
            )}
            {isAparat && (
              <span className="text-xs text-muted-foreground">کاور از آپارات گرفته می‌شود</span>
            )}
          </div>
        )}

        {!isCardDropzone &&
          dropzone &&
          (kind !== "video" || fileOnly) &&
          !(kind === "video" && isDirectVideo) &&
          !hideImageLinkField && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            فایل را اینجا بکشید و رها کنید
          </p>
        )}
      </div>

      {useBuiltInImageCard && showLinkInput && !fileOnly && (!value || showLinkEditor) ? (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          dir="ltr"
          placeholder="یا لینک تصویر را وارد کنید"
          className="font-mono text-xs"
        />
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={accept ?? (kind === "video" ? "video/*" : kind === "audio" ? "audio/*" : "image/*")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleUpload(file);
        }}
      />

      {showSeparateImagePreview && (
        <div className="relative h-24 w-full overflow-hidden rounded-lg border bg-muted">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <MediaPlaceholder kind="image" className="h-24" />
          )}
        </div>
      )}

      {showPreview && kind === "video" && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-black">
          {isDirectVideo ? (
            <video
              key={value}
              src={value}
              className="h-full w-full object-contain"
              controls
              playsInline
              preload="metadata"
            />
          ) : isAparat ? (
            <iframe
              key={aparatEmbedUrl}
              src={aparatEmbedUrl}
              title="پیش‌نمایش آپارات"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : videoPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={videoPreviewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <MediaPlaceholder kind="video" className="h-full" />
          )}
        </div>
      )}

      {kind === "audio" && value && (
        <audio src={value} controls className="w-full" preload="metadata" />
      )}
    </div>
  );
}
