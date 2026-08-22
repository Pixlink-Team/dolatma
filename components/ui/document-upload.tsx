"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { forceClientReauth, redirectIfSessionExpired } from "@/lib/auth/client-reauth";
import { isDirectImageUrl, isDirectVideoUrl } from "@/lib/media-utils";
import { cn, formatPersianNumber } from "@/lib/utils";
import { ExternalLink, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface DocumentUploadProps {
  value: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  onChange: (payload: { url: string; fileName: string; fileSize: number; mimeType: string }) => void;
  label?: string;
  disabled?: boolean;
  /**
   * letter = PDF or image (official directive letter).
   * document = PDF/Office/text only (default).
   * action = document, image, or video (directive action attachments).
   */
  variant?: "document" | "letter" | "action";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${formatPersianNumber(bytes)} B`;
  if (bytes < 1024 * 1024) return `${formatPersianNumber(Math.round(bytes / 1024))} KB`;
  return `${formatPersianNumber(Math.round(bytes / (1024 * 1024)))} MB`;
}

function isUploadedImage(url: string, mimeType?: string, name?: string): boolean {
  if (mimeType?.startsWith("image/")) return true;
  if (isDirectImageUrl(url)) return true;
  return Boolean(name && /\.(jpe?g|png|webp|gif|avif)$/i.test(name));
}

function isUploadedPdf(url: string, mimeType?: string, name?: string): boolean {
  if (mimeType === "application/pdf") return true;
  if (/\.pdf(\?.*)?$/i.test(url)) return true;
  return Boolean(name && /\.pdf$/i.test(name));
}

function isUploadedVideo(url: string, mimeType?: string, name?: string): boolean {
  if (mimeType?.startsWith("video/")) return true;
  if (isDirectVideoUrl(url)) return true;
  return Boolean(name && /\.(mp4|webm|mov|m4v|mkv|avi)(\?.*)?$/i.test(name));
}

const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const DOCUMENT_EXTENSIONS = /\.(pdf|docx?|xlsx?|txt|rar)$/i;

function resolveUploadKind(
  file: File,
  variant: DocumentUploadProps["variant"]
): "image" | "video" | "document" | null {
  if (variant === "letter") {
    const isPdfFile = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const isImageFile = file.type.startsWith("image/");
    if (!isPdfFile && !isImageFile) return null;
    return isImageFile ? "image" : "document";
  }

  if (variant === "action") {
    if (file.type.startsWith("image/")) return "image";
    if (VIDEO_TYPES.has(file.type) || /\.(mp4|webm|mov|m4v)$/i.test(file.name)) return "video";
    if (
      file.type === "application/pdf" ||
      file.type.startsWith("application/vnd.") ||
      file.type === "application/msword" ||
      file.type === "text/plain" ||
      file.type.includes("rar") ||
      DOCUMENT_EXTENSIONS.test(file.name)
    ) {
      return "document";
    }
    return null;
  }

  return "document";
}

const LETTER_ACCEPT =
  ".pdf,image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif,application/pdf";

const DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.txt,.rar,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,application/vnd.rar,application/x-rar-compressed,application/x-rar";

const ACTION_ACCEPT = `${DOCUMENT_ACCEPT},image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v`;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

const EMPTY_FILE = { url: "", fileName: "", fileSize: 0, mimeType: "" };

export function DocumentUpload({
  value,
  fileName,
  fileSize,
  mimeType,
  onChange,
  label,
  disabled,
  variant = "document",
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isLetter = variant === "letter";
  const isAction = variant === "action";
  const hasFile = Boolean(value.trim());
  const displayName = fileName?.trim() || "فایل آپلود شده";
  const isImage = hasFile && isUploadedImage(value, mimeType, fileName);
  const isPdf = hasFile && isUploadedPdf(value, mimeType, fileName);
  const isVideo = hasFile && isUploadedVideo(value, mimeType, fileName);

  const handleUpload = async (file: File) => {
    const kind = resolveUploadKind(file, variant);
    if (!kind) {
      toast.error(
        isAction
          ? "فقط سند، تصویر یا ویدیو مجاز است"
          : "فقط PDF یا تصویر مجاز است"
      );
      return;
    }

    const maxBytes =
      kind === "image"
        ? MAX_IMAGE_BYTES
        : kind === "video"
          ? MAX_VIDEO_BYTES
          : MAX_DOCUMENT_BYTES;
    if (file.size > maxBytes) {
      toast.error(
        kind === "image"
          ? `حجم تصویر بیشتر از ${formatPersianNumber(10)} مگابایت است`
          : kind === "video"
            ? `حجم ویدیو بیشتر از ${formatPersianNumber(100)} مگابایت است`
            : `حجم فایل بیشتر از ${formatPersianNumber(25)} مگابایت است`
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);

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
        fileName: string;
        fileSize: number;
        mimeType: string;
      };

      onChange(data);
      toast.success("فایل با موفقیت آپلود شد");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "آپلود ناموفق بود");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clearFile = () => {
    onChange(EMPTY_FILE);
  };

  const openFile = () => {
    window.open(value, "_blank", "noopener,noreferrer");
  };

  const dropzoneHint = isLetter
    ? "PDF یا تصویر نامه رسمی — تصویر تا ۱۰، PDF تا ۲۵ مگابایت"
    : isAction
      ? "سند، تصویر یا ویدیو — تصویر تا ۱۰، ویدیو تا ۱۰۰، سند تا ۲۵ مگابایت"
      : "PDF، Word، Excel، RAR یا فایل متنی — حداکثر ۲۵ مگابایت";

  const emptyDropzone = (
    <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
      <FileText className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{dropzoneHint}</p>
      <span className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
        <Upload className="h-3.5 w-3.5" />
        انتخاب فایل
      </span>
      <p className="text-xs text-muted-foreground">فایل را اینجا بکشید و رها کنید</p>
    </div>
  );

  const filePreview = (
    <div className="relative min-h-40 w-full overflow-hidden rounded-[10px] bg-muted sm:min-h-48">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt={displayName} className="h-full min-h-40 w-full object-contain sm:min-h-48" />
      ) : isVideo ? (
        <video
          src={value}
          controls
          playsInline
          preload="metadata"
          className="h-full min-h-40 w-full bg-black object-contain sm:min-h-48"
        />
      ) : isPdf ? (
        <iframe
          src={value}
          title={displayName}
          className="h-64 w-full bg-white sm:h-80"
        />
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 px-4 py-8 text-center sm:min-h-48">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">{displayName}</p>
            {fileSize ? (
              <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
            ) : null}
          </div>
        </div>
      )}

      {!disabled ? (
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
          {!isImage && !isPdf && !isVideo ? (
            <Button type="button" variant="secondary" size="sm" className="h-8" onClick={openFile}>
              <ExternalLink className="h-4 w-4" />
              باز کردن
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 text-destructive"
            onClick={clearFile}
          >
            <Trash2 className="h-4 w-4" />
            حذف
          </Button>
        </div>
      ) : null}

      {hasFile && !isImage && !isPdf && !isVideo ? (
        <div className="border-t bg-background/90 px-3 py-2 text-center text-xs text-muted-foreground">
          {displayName}
          {fileSize ? ` — ${formatFileSize(fileSize)}` : ""}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-2 text-right" dir="rtl">
      {label && <Label>{label}</Label>}

      <div
        role={!hasFile && !disabled ? "button" : undefined}
        tabIndex={!hasFile && !disabled ? 0 : undefined}
        onClick={
          !hasFile && !disabled
            ? () => {
                if (uploading) return;
                inputRef.current?.click();
              }
            : undefined
        }
        onKeyDown={
          !hasFile && !disabled
            ? (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                if (uploading) return;
                inputRef.current?.click();
              }
            : undefined
        }
        onDragOver={(event) => {
          if (disabled || hasFile) return;
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          if (disabled || hasFile) return;
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void handleUpload(file);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed transition-colors",
          hasFile ? "overflow-hidden border-solid border-border p-0" : "p-0",
          !hasFile && !disabled && "cursor-pointer",
          !hasFile && isDragging && "border-primary bg-primary/5",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <div className="relative w-full">
          {hasFile ? filePreview : emptyDropzone}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={isLetter ? LETTER_ACCEPT : isAction ? ACTION_ACCEPT : DOCUMENT_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleUpload(file);
        }}
      />
    </div>
  );
}
