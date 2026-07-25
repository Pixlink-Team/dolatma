"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Camera, Download, FileArchive, Loader2, Trash2, Upload } from "lucide-react";
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
  const [backups, setBackups] = useState<StoredBackup[]>([]);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
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
        backups?: StoredBackup[];
        error?: string;
      };
      if (!response.ok) {
        toast.error(result.error ?? "خطا در خواندن فهرست پشتیبان‌ها");
        return;
      }
      setBackups(result.backups ?? []);
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
          toast.error(result.error ?? "ساخت پشتیبان ناموفق بود");
          return;
        }
        toast.success("پشتیبان ساخته و روی سایت ذخیره شد");
        await refreshBackups();
      } catch {
        toast.error("ساخت پشتیبان ناموفق بود");
      } finally {
        setIsCreating(false);
      }
    });
  };

  const handleDeleteBackup = (backup: StoredBackup) => {
    if (!campaignId) return;
    if (
      !window.confirm(
        `پشتیبان «${formatBackupDate(backup.createdAt)}» از سرور حذف شود؟ این کار قابل بازگشت نیست.`
      )
    ) {
      return;
    }

    setDeletingFilename(backup.filename);
    startTransition(async () => {
      try {
        const response = await fetch("/api/campaign/backup", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId, filename: backup.filename }),
        });
        const result = (await response.json()) as {
          success?: boolean;
          error?: string;
        };
        if (!response.ok || !result.success) {
          toast.error(result.error ?? "حذف پشتیبان ناموفق بود");
          return;
        }
        toast.success("پشتیبان از سرور حذف شد");
        await refreshBackups();
      } catch {
        toast.error("حذف پشتیبان ناموفق بود");
      } finally {
        setDeletingFilename(null);
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

      toast.success("راستا با موفقیت import شد");
      window.location.reload();
    });
  };

  // Backup + full report export are admin-only
  if (!isFullAdmin || !currentCampaign) return null;

  const busy = isPending || isCreating;
  const latestBackup = backups[0] ?? null;
  const totalBytes = backups.reduce((sum, item) => sum + item.sizeBytes, 0);

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
          ) : backups.length > 0 ? (
            <span>
              {backups.length} پشتیبان روی سرور · جمع حجم:{" "}
              <span className="font-medium text-foreground">{formatBytes(totalBytes)}</span>
            </span>
          ) : (
            <span>
              هنوز پشتیبان ذخیره‌شده‌ای وجود ندارد. می‌توانید دستی بسازید یا cron روزانه را فعال
              کنید.
            </span>
          )}
        </div>

        {backups.length > 0 && (
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-2">
            {backups.map((backup) => {
              const isDeleting = deletingFilename === backup.filename;
              return (
                <div
                  key={backup.filename}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/30 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-medium text-foreground">
                      {formatBackupDate(backup.createdAt)}
                      {latestBackup?.filename === backup.filename ? (
                        <span className="mr-2 text-xs font-normal text-muted-foreground">
                          (آخرین)
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-muted-foreground" dir="ltr">
                      {backup.filename} · {formatBytes(backup.sizeBytes)}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || isDeleting}
                      onClick={() => downloadStored(backup.filename)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      دانلود
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busy || isDeleting}
                      onClick={() => handleDeleteBackup(backup)}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      حذف
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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

          <Button variant="default" size="sm" disabled={busy} onClick={handleCreateBackup}>
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
