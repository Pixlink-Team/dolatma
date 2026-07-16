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
import { Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface MediaUploadProps {
  value: string;
  onChange: (url: string) => void;
  onUploaded?: (url: string) => void;
  onUploadedMeta?: (meta: {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }) => void;
  label?: string;
  kind?: "image" | "video" | "audio";
  uploadKind?: "image" | "video" | "audio" | "activity-video" | "raw-image" | "raw-video";
  accept?: string;
  dropzone?: boolean;
  fileOnly?: boolean;
  maxFileSizeBytes?: number;
}

export function MediaUpload({
  value,
  onChange,
  onUploaded,
  onUploadedMeta,
  label,
  kind = "image",
  uploadKind,
  accept,
  dropzone = true,
  fileOnly = false,
  maxFileSizeBytes,
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showLinkEditor, setShowLinkEditor] = useState(false);

  const handleUpload = async (file: File) => {
    if (maxFileSizeBytes && file.size > maxFileSizeBytes) {
      const maxMb = Math.round(maxFileSizeBytes / (1024 * 1024));
      const maxGb = Math.round((maxFileSizeBytes / (1024 * 1024 * 1024)) * 10) / 10;
      toast.error(
        maxFileSizeBytes >= 1024 * 1024 * 1024
          ? `حجم فایل نباید بیشتر از ${maxGb} گیگابایت باشد`
          : `حجم فایل نباید بیشتر از ${maxMb} مگابایت باشد`
      );
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", uploadKind ?? kind);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
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
      onUploadedMeta?.({
        url: data.url,
        fileName: data.fileName ?? file.name,
        fileSize: data.fileSize ?? file.size,
        mimeType: data.mimeType ?? file.type,
      });
      setShowLinkEditor(false);
      toast.success("فایل با موفقیت آپلود شد");
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

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}

      <div
        onDragOver={(event) => {
          if (!dropzone) return;
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={dropzone ? handleDrop : undefined}
        className={cn(
          "rounded-xl border-2 border-dashed p-3 transition-colors",
          dropzone && isDragging && "border-primary bg-primary/5",
          !dropzone && "border-transparent p-0"
        )}
      >
        {kind === "video" && !fileOnly ? (
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
        ) : hideImageLinkField ? null : (
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
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="shrink-0"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {kind === "video" && fileOnly ? "آپلود ویدیو" : dropzone ? "انتخاب فایل" : "آپلود"}
            </Button>
          </div>
        )}

        {kind === "audio" && (
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

        {kind === "image" && isLocalUploadedImage && (
          <div className={cn("flex flex-wrap items-center gap-2", hideImageLinkField ? "mt-0" : "mt-2")}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              تعویض تصویر
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowLinkEditor((current) => !current)}
            >
              {showLinkEditor ? "پنهان کردن لینک" : "نمایش لینک"}
            </Button>
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
          </div>
        )}

        {kind === "video" && !fileOnly && (
          <div className={cn("flex flex-wrap items-center gap-2", hideVideoLinkField ? "mt-0" : "mt-2")}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isDirectVideo ? "تعویض فایل" : "آپلود فایل"}
            </Button>
            {isDirectVideo && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLinkEditor((current) => !current)}
                >
                  {showLinkEditor ? "پنهان کردن لینک" : "نمایش لینک"}
                </Button>
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

        {dropzone &&
          (kind !== "video" || fileOnly) &&
          !(kind === "video" && isDirectVideo) &&
          !hideImageLinkField && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            فایل را اینجا بکشید و رها کنید
          </p>
        )}
      </div>

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

      {kind === "image" && (
        <div className="relative h-24 w-full overflow-hidden rounded-lg border bg-muted">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <MediaPlaceholder kind="image" className="h-24" />
          )}
        </div>
      )}

      {kind === "video" && (
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
