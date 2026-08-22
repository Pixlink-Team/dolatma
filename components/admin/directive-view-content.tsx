"use client";

import {
  Download,
  FileImage,
  FileText,
  FileVideo,
  ScrollText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDirectiveActionAttachments } from "@/lib/directive-attachments";
import { isDirectImageUrl, isDirectVideoUrl } from "@/lib/media-utils";
import type { CampaignDirective } from "@/lib/types";
import { cn, formatPersianDate, formatPersianDateTime, formatPersianNumber } from "@/lib/utils";

type DirectiveFileKind = "image" | "video" | "pdf" | "document";

function formatDirectiveFileSize(bytes: number): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024) return `${formatPersianNumber(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${formatPersianNumber(Math.round(bytes / 1024))} کیلوبایت`;
  return `${formatPersianNumber(Math.round(bytes / (1024 * 1024)))} مگابایت`;
}

function resolveDirectiveFileKind(
  url: string,
  mimeType?: string,
  fileName?: string
): DirectiveFileKind {
  if (mimeType?.startsWith("image/") || isDirectImageUrl(url)) return "image";
  if (
    mimeType?.startsWith("video/") ||
    isDirectVideoUrl(url) ||
    /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url) ||
    Boolean(fileName && /\.(mp4|webm|mov|m4v)$/i.test(fileName))
  ) {
    return "video";
  }
  if (mimeType === "application/pdf" || /\.pdf(\?.*)?$/i.test(url) || /\.pdf$/i.test(fileName ?? "")) {
    return "pdf";
  }
  return "document";
}

const FILE_KIND_LABELS: Record<DirectiveFileKind, string> = {
  image: "تصویر",
  video: "ویدیو",
  pdf: "PDF",
  document: "سند",
};

function FileKindIcon({ kind, className }: { kind: DirectiveFileKind; className?: string }) {
  if (kind === "image") return <FileImage className={className} />;
  if (kind === "video") return <FileVideo className={className} />;
  return <FileText className={className} />;
}

interface DirectiveFileCardProps {
  title: string;
  fileUrl: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  badgeLabel?: string;
  className?: string;
}

function DirectiveFileCard({
  title,
  fileUrl,
  fileName,
  mimeType,
  fileSize,
  badgeLabel,
  className,
}: DirectiveFileCardProps) {
  const kind = resolveDirectiveFileKind(fileUrl, mimeType, fileName);
  const displayName = fileName.trim() || "فایل";
  const sizeLabel = formatDirectiveFileSize(fileSize ?? 0);

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-colors hover:border-primary/30",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b bg-muted/20 px-3 py-2.5">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="break-words text-sm font-semibold leading-snug">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{displayName}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 gap-1">
          <FileKindIcon kind={kind} className="h-3.5 w-3.5" />
          {badgeLabel ?? FILE_KIND_LABELS[kind]}
        </Badge>
      </div>

      <div className="relative min-h-[10rem] bg-muted/30 sm:min-h-[11rem]">
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fileUrl}
            alt={title}
            className="h-full min-h-[10rem] w-full object-contain sm:min-h-[11rem]"
          />
        ) : kind === "video" ? (
          <video
            src={fileUrl}
            controls
            playsInline
            preload="metadata"
            className="h-full min-h-[10rem] w-full bg-black object-contain sm:min-h-[11rem]"
          />
        ) : kind === "pdf" ? (
          <iframe src={fileUrl} title={title} className="h-56 w-full bg-white sm:h-64" />
        ) : (
          <div className="flex min-h-[10rem] flex-col items-center justify-center gap-3 px-4 py-8 text-center sm:min-h-[11rem]">
            <FileText className="h-12 w-12 text-muted-foreground/80" />
            {sizeLabel ? <p className="text-xs text-muted-foreground">{sizeLabel}</p> : null}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2.5">
        {sizeLabel ? (
          <span className="text-xs text-muted-foreground">{sizeLabel}</span>
        ) : (
          <span className="text-xs text-muted-foreground">دانلود فایل</span>
        )}
        <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
          <a href={fileUrl} target="_blank" rel="noreferrer" download={displayName}>
            <Download className="h-4 w-4" />
            دانلود
          </a>
        </Button>
      </div>
    </article>
  );
}

export function DirectiveOfficialLetterSection({ item }: { item: CampaignDirective }) {
  if (!item.letterFileUrl) {
    return (
      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <ScrollText className="h-4 w-4 text-muted-foreground" />
          نامه رسمی
        </h3>
        <p className="text-sm text-muted-foreground">نامه رسمی آپلود نشده</p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <ScrollText className="h-4 w-4 text-muted-foreground" />
        نامه رسمی
      </h3>
      <DirectiveFileCard
        title="نامه رسمی"
        fileUrl={item.letterFileUrl}
        fileName={item.letterFileName ?? "نامه رسمی"}
        mimeType={item.letterMimeType}
        fileSize={item.letterFileSize}
        badgeLabel="نامه"
      />
    </section>
  );
}

export function DirectiveActionFilesSection({ item }: { item: CampaignDirective }) {
  const files = getDirectiveActionAttachments(item);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-muted-foreground" />
          فایل‌های اقدام
        </h3>
        {files.length > 0 ? (
          <Badge variant="secondary">{formatPersianNumber(files.length)} فایل</Badge>
        ) : null}
      </div>

      {files.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          فایل اقدامی اضافه نشده
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {files.map((file, index) => (
            <DirectiveFileCard
              key={file.id}
              title={file.title.trim() || `فایل اقدام ${formatPersianNumber(index + 1)}`}
              fileUrl={file.fileUrl}
              fileName={file.fileName}
              mimeType={file.mimeType}
              fileSize={file.fileSize}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function DirectiveViewMeta({ item }: { item: CampaignDirective }) {
  const start = item.startDate;
  const end = item.endDate ?? item.dueDate;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>انتشار: {formatPersianDateTime(item.publishedAt ?? item.createdAt)}</span>
      {start ? <span>شروع: {formatPersianDate(start)}</span> : null}
      {end ? <span>پایان: {formatPersianDate(end)}</span> : null}
      {item.createdByName ? <span>از طرف: {item.createdByName}</span> : null}
    </div>
  );
}

export function DirectiveViewBody({ item }: { item: CampaignDirective }) {
  return (
    <div className="rounded-xl border bg-muted/15 px-4 py-3">
      <p className="whitespace-pre-wrap text-sm leading-7">{item.body}</p>
    </div>
  );
}

/** Organized directive content for inbox, modal, and detail views. */
export function DirectiveUserView({
  item,
  className,
  showMeta = true,
}: {
  item: CampaignDirective;
  className?: string;
  showMeta?: boolean;
}) {
  return (
    <div className={cn("space-y-5", className)}>
      <DirectiveViewBody item={item} />
      {showMeta ? <DirectiveViewMeta item={item} /> : null}
      <DirectiveOfficialLetterSection item={item} />
      <DirectiveActionFilesSection item={item} />
    </div>
  );
}
