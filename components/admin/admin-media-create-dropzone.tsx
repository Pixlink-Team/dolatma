"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Upload, VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MediaCreateKind = "image" | "video";

interface AdminMediaCreateDropzoneProps {
  kind: MediaCreateKind;
  onUploaded: (url: string, file: File) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

async function uploadMediaFile(file: File, kind: MediaCreateKind): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "آپلود ناموفق بود");
  }

  const data = (await response.json()) as { url: string };
  return data.url;
}

export function AdminMediaCreateDropzone({
  kind,
  onUploaded,
  disabled = false,
  compact = false,
  className,
}: AdminMediaCreateDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isVideo = kind === "video";
  const Icon = isVideo ? VideoIcon : ImageIcon;
  const hint = isVideo
    ? "ویدیو را بکشید و رها کنید یا انتخاب کنید"
    : "تصویر را بکشید و رها کنید یا انتخاب کنید";
  const buttonLabel = isVideo ? "انتخاب ویدیو" : "انتخاب تصویر";
  const accept = isVideo ? "video/*" : "image/*";

  const handleFile = async (file: File | null) => {
    if (!file || uploading || disabled) return;
    if (isVideo && !file.type.startsWith("video/")) {
      toast.error("فقط فایل ویدیو مجاز است");
      return;
    }
    if (!isVideo && !file.type.startsWith("image/")) {
      toast.error("فقط فایل تصویر مجاز است");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadMediaFile(file, kind);
      toast.success("فایل با موفقیت آپلود شد");
      onUploaded(url, file);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "آپلود ناموفق بود");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled || uploading ? -1 : 0}
      onClick={() => {
        if (disabled || uploading) return;
        inputRef.current?.click();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (disabled || uploading) return;
        inputRef.current?.click();
      }}
      onDragOver={(event) => {
        if (disabled || uploading) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        if (disabled || uploading) return;
        event.preventDefault();
        setIsDragging(false);
        void handleFile(event.dataTransfer.files?.[0] ?? null);
      }}
      className={cn(
        "relative flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/30 p-3 text-center transition-colors",
        "hover:border-primary hover:bg-primary/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "border-primary bg-primary/5",
        (disabled || uploading) && "pointer-events-none opacity-50",
        compact ? "min-h-28" : isVideo ? "aspect-video" : "aspect-[3/4]",
        className
      )}
    >
      <Icon className={cn("text-muted-foreground", compact ? "h-6 w-6" : "h-8 w-8")} />
      <p className="px-1 text-xs text-muted-foreground">{hint}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || uploading}
        onClick={(event) => {
          event.stopPropagation();
          inputRef.current?.click();
        }}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {buttonLabel}
      </Button>

      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0] ?? null);
        }}
      />
    </div>
  );
}
