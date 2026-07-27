"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  Archive,
  Download,
  FileArchive,
  HardDrive,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatStorageBytes } from "@/lib/raw-media-storage";
import { formatPersianDateTime, formatPersianNumber } from "@/lib/utils";

const ALL_CAMPAIGNS = "__all__";
const NEW_CAMPAIGN = "__new__";

interface CampaignOption {
  id: string;
  slug: string;
  title: string;
}

interface StoredBackup {
  filename: string;
  campaignId: string;
  campaignSlug: string;
  campaignTitle: string;
  sizeBytes: number;
  createdAt: string;
  source: "manual" | "scheduled" | "unknown";
}

interface BackupsAdminProps {
  campaigns: CampaignOption[];
  initialBackups: StoredBackup[];
  databaseReady: boolean;
}

type PendingAction =
  | { kind: "backup-all" }
  | { kind: "backup-one"; campaignId: string }
  | { kind: "delete-one"; backup: StoredBackup }
  | { kind: "delete-selected" }
  | { kind: "cleanup-older"; days: number }
  | { kind: "cleanup-keep"; keep: number }
  | { kind: "import"; file: File; campaignId: string | null };

const SOURCE_LABELS: Record<StoredBackup["source"], string> = {
  manual: "دستی",
  scheduled: "خودکار (شبانه)",
  unknown: "نامشخص",
};

export function BackupsAdmin({ campaigns, initialBackups, databaseReady }: BackupsAdminProps) {
  const [backups, setBackups] = useState<StoredBackup[]>(initialBackups);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [campaignFilter, setCampaignFilter] = useState(ALL_CAMPAIGNS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [backupCampaignId, setBackupCampaignId] = useState(campaigns[0]?.id ?? "");
  const [importCampaignId, setImportCampaignId] = useState<string>(NEW_CAMPAIGN);
  const [olderThanDays, setOlderThanDays] = useState("30");
  const [keepPerCampaign, setKeepPerCampaign] = useState("7");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const filteredBackups = useMemo(() => {
    if (campaignFilter === ALL_CAMPAIGNS) return backups;
    return backups.filter((backup) => backup.campaignId === campaignFilter);
  }, [backups, campaignFilter]);

  const totalBytes = useMemo(
    () => backups.reduce((sum, item) => sum + item.sizeBytes, 0),
    [backups]
  );
  const campaignsWithBackups = useMemo(
    () => new Set(backups.map((item) => item.campaignId)).size,
    [backups]
  );

  const selectionKey = (backup: StoredBackup) => `${backup.campaignId}::${backup.filename}`;

  const toggleSelected = (backup: StoredBackup) => {
    const key = selectionKey(backup);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const visibleKeys = filteredBackups.map(selectionKey);
      const allSelected = visibleKeys.every((key) => prev.has(key));
      const next = new Set(prev);
      if (allSelected) {
        for (const key of visibleKeys) next.delete(key);
      } else {
        for (const key of visibleKeys) next.add(key);
      }
      return next;
    });
  };

  const refresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/campaign/backups");
      const result = (await response.json()) as { success?: boolean; backups?: StoredBackup[]; error?: string };
      if (!response.ok || !result.success) {
        toast.error(result.error ?? "خطا در بارگذاری فهرست پشتیبان‌ها");
        return;
      }
      setBackups(result.backups ?? []);
      setSelected(new Set());
    } catch {
      toast.error("خطا در بارگذاری فهرست پشتیبان‌ها");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadBackup = (backup: StoredBackup) => {
    const params = new URLSearchParams({ campaignId: backup.campaignId, filename: backup.filename });
    const link = document.createElement("a");
    link.href = `/api/campaign/backup?${params.toString()}`;
    link.download = backup.filename;
    link.click();
  };

  const runAction = (action: PendingAction) => {
    startTransition(async () => {
      try {
        if (action.kind === "backup-all") {
          const response = await fetch("/api/campaign/backups", { method: "POST" });
          const result = (await response.json()) as {
            success?: boolean;
            created?: unknown[];
            failed?: unknown[];
            error?: string;
          };
          if (!response.ok || !result.success) {
            toast.error(result.error ?? "پشتیبان‌گیری ناموفق بود");
            return;
          }
          toast.success(
            `${formatPersianNumber(result.created?.length ?? 0)} راستا پشتیبان‌گیری شد` +
              ((result.failed?.length ?? 0) > 0
                ? ` — ${formatPersianNumber(result.failed?.length ?? 0)} مورد ناموفق`
                : "")
          );
          await refresh();
          return;
        }

        if (action.kind === "backup-one") {
          const response = await fetch("/api/campaign/backup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ campaignId: action.campaignId }),
          });
          const result = (await response.json()) as { success?: boolean; error?: string };
          if (!response.ok || !result.success) {
            toast.error(result.error ?? "ساخت پشتیبان ناموفق بود");
            return;
          }
          toast.success("پشتیبان ساخته شد");
          await refresh();
          return;
        }

        if (action.kind === "delete-one") {
          const response = await fetch("/api/campaign/backup", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignId: action.backup.campaignId,
              filename: action.backup.filename,
            }),
          });
          const result = (await response.json()) as { success?: boolean; error?: string };
          if (!response.ok || !result.success) {
            toast.error(result.error ?? "حذف پشتیبان ناموفق بود");
            return;
          }
          toast.success("پشتیبان حذف شد");
          await refresh();
          return;
        }

        if (action.kind === "delete-selected") {
          const targets = backups
            .filter((backup) => selected.has(selectionKey(backup)))
            .map((backup) => ({ campaignId: backup.campaignId, filename: backup.filename }));
          if (targets.length === 0) return;

          const response = await fetch("/api/campaign/backup/cleanup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targets }),
          });
          const result = (await response.json()) as {
            success?: boolean;
            deletedCount?: number;
            error?: string;
          };
          if (!response.ok || !result.success) {
            toast.error(result.error ?? "حذف گروهی ناموفق بود");
            return;
          }
          toast.success(`${formatPersianNumber(result.deletedCount ?? 0)} پشتیبان حذف شد`);
          await refresh();
          return;
        }

        if (action.kind === "cleanup-older") {
          const response = await fetch("/api/campaign/backup/cleanup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ olderThanDays: action.days }),
          });
          const result = (await response.json()) as {
            success?: boolean;
            deletedCount?: number;
            error?: string;
          };
          if (!response.ok || !result.success) {
            toast.error(result.error ?? "پاک‌سازی ناموفق بود");
            return;
          }
          toast.success(`${formatPersianNumber(result.deletedCount ?? 0)} پشتیبان قدیمی حذف شد`);
          await refresh();
          return;
        }

        if (action.kind === "cleanup-keep") {
          const response = await fetch("/api/campaign/backup/cleanup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keepPerCampaign: action.keep }),
          });
          const result = (await response.json()) as {
            success?: boolean;
            deletedCount?: number;
            error?: string;
          };
          if (!response.ok || !result.success) {
            toast.error(result.error ?? "پاک‌سازی ناموفق بود");
            return;
          }
          toast.success(`${formatPersianNumber(result.deletedCount ?? 0)} پشتیبان اضافه حذف شد`);
          await refresh();
          return;
        }

        if (action.kind === "import") {
          const formData = new FormData();
          formData.append("file", action.file);
          if (action.campaignId) formData.append("campaignId", action.campaignId);

          const response = await fetch("/api/campaign/import", {
            method: "POST",
            body: formData,
          });
          const result = (await response.json()) as { success?: boolean; error?: string };
          if (!response.ok) {
            toast.error(result.error ?? "ایمپورت ناموفق بود");
            return;
          }
          toast.success("محتوای ZIP با موفقیت ایمپورت شد");
          await refresh();
        }
      } finally {
        setPendingAction(null);
        if (importInputRef.current) importInputRef.current.value = "";
      }
    });
  };

  if (!databaseReady) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Archive className="h-6 w-6 text-primary" />
            پشتیبان‌گیری
          </h1>
          <p className="text-sm text-muted-foreground mt-1">مدیریت پشتیبان‌های ZIP همه راستاها.</p>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            این بخش فقط با اتصال به پایگاه داده فعال است.
          </CardContent>
        </Card>
      </div>
    );
  }

  const busy = isPending || isLoading;
  const selectedCount = selected.size;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Archive className="h-6 w-6 text-primary" />
            پشتیبان‌گیری
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ساخت، دانلود، پاک‌سازی و ایمپورت پشتیبان ZIP برای همه راستاها.
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void refresh()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          بروزرسانی
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="تعداد پشتیبان‌ها" value={formatPersianNumber(backups.length)} icon={FileArchive} />
        <StatCard label="حجم کل" value={formatStorageBytes(totalBytes)} icon={HardDrive} />
        <StatCard
          label="راستاهای دارای پشتیبان"
          value={`${formatPersianNumber(campaignsWithBackups)} از ${formatPersianNumber(campaigns.length)}`}
          icon={Archive}
        />
        <StatCard
          label="آخرین پشتیبان"
          value={backups[0] ? formatPersianDateTime(backups[0].createdAt) : "—"}
          icon={FileArchive}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ساخت پشتیبان جدید</CardTitle>
          <CardDescription>
            پشتیبان همه راستاها را یک‌جا بسازید یا برای یک راستای خاص پشتیبان تازه بگیرید.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Button
            variant="default"
            disabled={busy}
            onClick={() => setPendingAction({ kind: "backup-all" })}
          >
            <FileArchive className="h-4 w-4" />
            پشتیبان‌گیری از همه راستاها
          </Button>

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">راستا</Label>
              <Select value={backupCampaignId} onValueChange={setBackupCampaignId}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="انتخاب راستا" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              disabled={busy || !backupCampaignId}
              onClick={() => runAction({ kind: "backup-one", campaignId: backupCampaignId })}
            >
              <FileArchive className="h-4 w-4" />
              ساخت پشتیبان برای این راستا
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">پاک‌سازی پشتیبان‌ها</CardTitle>
          <CardDescription>فایل‌های اضافی یا قدیمی را از روی سرور پاک کنید — این کار قابل بازگشت نیست.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">حذف قدیمی‌تر از (روز)</Label>
              <Input
                type="number"
                min={1}
                className="w-28"
                value={olderThanDays}
                onChange={(event) => setOlderThanDays(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              disabled={busy || !Number(olderThanDays)}
              onClick={() =>
                setPendingAction({ kind: "cleanup-older", days: Math.max(1, Number(olderThanDays) || 0) })
              }
            >
              <Trash2 className="h-4 w-4" />
              پاک‌سازی
            </Button>
          </div>

          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">نگه‌داشتن N مورد آخر هر راستا</Label>
              <Input
                type="number"
                min={0}
                className="w-28"
                value={keepPerCampaign}
                onChange={(event) => setKeepPerCampaign(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              disabled={busy || keepPerCampaign === ""}
              onClick={() =>
                setPendingAction({ kind: "cleanup-keep", keep: Math.max(0, Number(keepPerCampaign) || 0) })
              }
            >
              <Trash2 className="h-4 w-4" />
              پاک‌سازی مازاد
            </Button>
          </div>

          <Button
            variant="destructive"
            disabled={busy || selectedCount === 0}
            onClick={() => setPendingAction({ kind: "delete-selected" })}
          >
            <Trash2 className="h-4 w-4" />
            حذف {selectedCount > 0 ? `${formatPersianNumber(selectedCount)} مورد انتخاب‌شده` : "انتخاب‌شده‌ها"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">فهرست پشتیبان‌ها</CardTitle>
            <CardDescription>{formatPersianNumber(filteredBackups.length)} مورد</CardDescription>
          </div>
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="فیلتر راستا" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CAMPAIGNS}>همه راستاها</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {filteredBackups.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              پشتیبانی برای نمایش وجود ندارد.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="flex items-center gap-3 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={
                    filteredBackups.length > 0 &&
                    filteredBackups.every((backup) => selected.has(selectionKey(backup)))
                  }
                  onChange={toggleSelectAllVisible}
                  aria-label="انتخاب همه"
                />
                <span>انتخاب همه موارد نمایش‌داده‌شده</span>
              </div>
              <div className="divide-y">
                {filteredBackups.map((backup) => (
                  <div
                    key={selectionKey(backup)}
                    className="flex flex-wrap items-center gap-3 px-3 py-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0"
                      checked={selected.has(selectionKey(backup))}
                      onChange={() => toggleSelected(backup)}
                      aria-label="انتخاب پشتیبان"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{backup.campaignTitle}</span>
                        <span className="text-xs text-muted-foreground">
                          {SOURCE_LABELS[backup.source]}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground" dir="ltr">
                        {backup.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPersianDateTime(backup.createdAt)} · {formatStorageBytes(backup.sizeBytes)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => downloadBackup(backup)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        دانلود
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busy}
                        onClick={() => setPendingAction({ kind: "delete-one", backup })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ایمپورت از ZIP</CardTitle>
          <CardDescription>
            محتوای فایل پشتیبان را به‌عنوان مطالب جدید اضافه می‌کند — محتوای فعلی را جایگزین نمی‌کند و
            پاک نمی‌کند. برای ساخت راستای تازه از این پشتیبان، گزینه «راستای جدید» را انتخاب کنید.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">مقصد</Label>
            <Select value={importCampaignId} onValueChange={setImportCampaignId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="انتخاب مقصد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NEW_CAMPAIGN}>راستای جدید</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    افزودن به: {campaign.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            disabled={busy}
            onClick={() => importInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            انتخاب فایل ZIP
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setPendingAction({
                kind: "import",
                file,
                campaignId: importCampaignId === NEW_CAMPAIGN ? null : importCampaignId,
              });
            }}
          />
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
            if (importInputRef.current) importInputRef.current.value = "";
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle(pendingAction)}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription(pendingAction)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                if (pendingAction) runAction(pendingAction);
              }}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              تایید
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function confirmTitle(action: PendingAction | null): string {
  if (!action) return "";
  switch (action.kind) {
    case "backup-all":
      return "پشتیبان‌گیری از همه راستاها";
    case "delete-one":
      return "حذف پشتیبان";
    case "delete-selected":
      return "حذف گروهی پشتیبان‌ها";
    case "cleanup-older":
      return "پاک‌سازی پشتیبان‌های قدیمی";
    case "cleanup-keep":
      return "پاک‌سازی پشتیبان‌های مازاد";
    case "import":
      return "ایمپورت از ZIP";
    default:
      return "تایید عملیات";
  }
}

function confirmDescription(action: PendingAction | null): string {
  if (!action) return "";
  switch (action.kind) {
    case "backup-all":
      return "برای همه راستاها یک پشتیبان تازه ساخته می‌شود. بسته به تعداد راستاها ممکن است کمی طول بکشد.";
    case "delete-one":
      return `پشتیبان «${action.backup.filename}» برای همیشه از سرور حذف می‌شود. این کار قابل بازگشت نیست.`;
    case "delete-selected":
      return "پشتیبان‌های انتخاب‌شده برای همیشه از سرور حذف می‌شوند. این کار قابل بازگشت نیست.";
    case "cleanup-older":
      return `همه پشتیبان‌های قدیمی‌تر از ${formatPersianNumber(action.days)} روز حذف می‌شوند. این کار قابل بازگشت نیست.`;
    case "cleanup-keep":
      return `برای هر راستا فقط ${formatPersianNumber(action.keep)} پشتیبان جدیدتر نگه داشته می‌شود و بقیه حذف می‌شوند. این کار قابل بازگشت نیست.`;
    case "import":
      return "محتوای فایل ZIP به‌عنوان رکوردهای جدید درج می‌شود. محتوای فعلی حذف یا جایگزین نمی‌شود، اما ممکن است تکراری ایجاد شود.";
    default:
      return "";
  }
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Archive;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="rounded-md bg-muted p-2 shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold tabular-nums truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
