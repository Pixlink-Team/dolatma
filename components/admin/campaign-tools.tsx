"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Camera, Download, FileArchive, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminCampaign } from "@/components/admin/admin-campaign-provider";

interface CampaignToolsProps {
  isFullAdmin: boolean;
}

interface StoredBackup {
  filename: string;
  campaignId: string;
  campaignSlug: string;
  sizeBytes: number;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBackupDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CampaignTools({ isFullAdmin }: CampaignToolsProps) {
  const { campaignId, currentCampaign } = useAdminCampaign();
  const [isPending, startTransition] = useTransition();
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [latestBackup, setLatestBackup] = useState<StoredBackup | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const refreshBackups = useCallback(async () => {
    if (!campaignId) return;
    setIsLoadingList(true);
    try {
      const response = await fetch(
        `/api/campaign/backups?campaignId=${encodeURIComponent(campaignId)}`
      );
      const result = (await response.json()) as {
        success?: boolean;
        latest?: StoredBackup | null;
        error?: string;
      };
      if (!response.ok) {
        toast.error(result.error ?? "خطا در خواندن فهرست پشتیبان‌ها");
        return;
      }
      setLatestBackup(result.latest ?? null);
    } catch {
      toast.error("خطا در خواندن فهرست پشتیبان‌ها");
    } finally {
      setIsLoadingList(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void refreshBackups();
  }, [refreshBackups]);

  const downloadStored = (filename?: string) => {
    if (!campaignId || !currentCampaign) return;
    const params = new URLSearchParams({ campaignId });
    if (filename) params.set("filename", filename);
    const link = document.createElement("a");
    link.href = `/api/campaign/backup?${params.toString()}`;
    link.download = filename ?? `backup-${currentCampaign.slug}.zip`;
    link.click();
  };

  const handleCreateBackup = () => {
    if (!campaignId) return;
    setIsCreating(true);
    startTransition(async () => {
      try {
        const response = await fetch("/api/campaign/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId }),
        });
        const result = (await response.json()) as {
          success?: boolean;
          backup?: StoredBackup;
          error?: string;
        };
        if (!response.ok || !result.success || !result.backup) {
          toast.error(result.error ?? "خطا در ساخت پشتیبان");
          return;
        }
        setLatestBackup(result.backup);
        toast.success("پشتیبان ساخته و روی سایت ذخیره شد");
      } catch {
        toast.error("خطا در ساخت پشتیبان");
      } finally {
        setIsCreating(false);
      }
    });
  };

  const handleImport = (file: File) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("campaignId", campaignId);

      const response = await fetch("/api/campaign/import", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error ?? "خطا در import");
        return;
      }

      toast.success("اقدام با موفقیت import شد");
      window.location.reload();
    });
  };

  // Backup + full report export are admin-only
  if (!isFullAdmin || !currentCampaign) return null;

  const busy = isPending || isCreating;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">خروجی و پشتیبان‌گیری</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {isLoadingList ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              در حال بررسی پشتیبان‌های ذخیره‌شده…
            </span>
          ) : latestBackup ? (
            <span>
              آخرین پشتیبان ذخیره‌شده:{" "}
              <span className="font-medium text-foreground">
                {formatBackupDate(latestBackup.createdAt)}
              </span>
              {" · "}
              {formatBytes(latestBackup.sizeBytes)}
            </span>
          ) : (
            <span>هنوز پشتیبان ذخیره‌شده‌ای وجود ندارد. می‌توانید دستی بسازید یا cron روزانه را فعال کنید.</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              window.open(
                `/campaign/${currentCampaign.slug}?export=screenshot`,
                "_blank",
                "noopener,noreferrer"
              );
            }}
          >
            <Camera className="h-4 w-4" />
            دانلود PDF گزارش کامل
          </Button>

          <Button
            variant="default"
            size="sm"
            disabled={busy}
            onClick={handleCreateBackup}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileArchive className="h-4 w-4" />
            )}
            {isCreating ? "در حال ساخت…" : "ساخت پشتیبان (ذخیره روی سایت)"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={busy || !latestBackup}
            onClick={() => downloadStored(latestBackup?.filename)}
          >
            <Download className="h-4 w-4" />
            دانلود آخرین پشتیبان
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => importRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Import از ZIP
          </Button>

          <input
            ref={importRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleImport(file);
              event.target.value = "";
            }}
          />

          <Button variant="ghost" size="sm" asChild>
            <a href={`/campaign/${currentCampaign.slug}`} target="_blank" rel="noreferrer">
              مشاهده گزارش زنده
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
