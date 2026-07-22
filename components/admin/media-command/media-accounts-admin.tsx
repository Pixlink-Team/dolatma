"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MediaCommandShell } from "@/components/admin/media-command/media-command-shell";
import { MediaEmptyState } from "@/components/admin/media-command/media-empty-state";
import { MediaAccountStatusBadge } from "@/components/admin/media-command/media-status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { MEDIA_PLATFORMS, getMediaPlatformLabel } from "@/lib/media-command/platforms";
import {
  MEDIA_ACCOUNT_PERMISSION_LABELS,
  MEDIA_ACCOUNT_STATUS_LABELS,
} from "@/lib/media-command/labels";
import type {
  MediaAccount,
  MediaAccountPermission,
  MediaAccountStatus,
} from "@/lib/media-command/types";
import type { MediaPlatformId } from "@/lib/media-command/platforms";
import {
  deleteMediaAccountAction,
  reconnectMediaAccountAction,
  upsertMediaAccountAction,
} from "@/lib/actions/media-command-actions";
import { formatPersianNumber } from "@/lib/utils";

const ALL_PERMISSIONS = Object.keys(MEDIA_ACCOUNT_PERMISSION_LABELS) as MediaAccountPermission[];

interface Props {
  campaignId: string;
  accounts: MediaAccount[];
}

type FormState = {
  id?: string;
  platform: MediaPlatformId;
  accountName: string;
  organizationName: string;
  status: MediaAccountStatus;
  allowsCentralPublish: boolean;
  requiresLocalApproval: boolean;
  activePermissions: MediaAccountPermission[];
};

const emptyForm = (): FormState => ({
  platform: "telegram",
  accountName: "",
  organizationName: "",
  status: "connected",
  allowsCentralPublish: false,
  requiresLocalApproval: true,
  activePermissions: ["view_stats", "create_draft", "publish", "schedule"],
});

export function MediaAccountsAdmin({ campaignId, accounts: initial }: Props) {
  const [accounts, setAccounts] = useState(initial);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.accountName.includes(q) ||
        a.organizationName.includes(q) ||
        getMediaPlatformLabel(a.platform).includes(q)
    );
  }, [accounts, query]);

  const openCreate = () => {
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (account: MediaAccount) => {
    setForm({
      id: account.id,
      platform: account.platform,
      accountName: account.accountName,
      organizationName: account.organizationName,
      status: account.status,
      allowsCentralPublish: account.allowsCentralPublish,
      requiresLocalApproval: account.requiresLocalApproval,
      activePermissions: account.activePermissions,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.accountName.trim()) {
      toast.error("نام حساب را وارد کنید");
      return;
    }
    setSaving(true);
    const result = await upsertMediaAccountAction({
      id: form.id,
      campaignId,
      platform: form.platform,
      accountName: form.accountName,
      organizationName: form.organizationName,
      status: form.status,
      allowsCentralPublish: form.allowsCentralPublish,
      requiresLocalApproval: form.requiresLocalApproval,
      activePermissions: form.activePermissions,
      accessUserIds: [],
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error ?? "ذخیره ناموفق بود");
      return;
    }
    toast.success(form.id ? "حساب به‌روزرسانی شد" : "حساب متصل شد");
    setOpen(false);
    window.location.reload();
  };

  const reconnect = async (id: string) => {
    const result = await reconnectMediaAccountAction(campaignId, id);
    if (!result.success) {
      toast.error(result.error ?? "اتصال مجدد ناموفق بود");
      return;
    }
    toast.success("حساب دوباره متصل شد");
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "connected", recentErrorCount: 0 } : a
      )
    );
  };

  const remove = async () => {
    if (!deleteId) return;
    const result = await deleteMediaAccountAction(campaignId, deleteId);
    if (!result.success) {
      toast.error(result.error ?? "حذف ناموفق بود");
      return;
    }
    toast.success("حساب حذف شد");
    setAccounts((prev) => prev.filter((a) => a.id !== deleteId));
    setDeleteId(null);
  };

  return (
    <MediaCommandShell
      campaignId={campaignId}
      title="حساب‌های متصل"
      description="مدیریت حساب‌های رسمی سازمان روی شبکه‌های پشتیبانی‌شده"
      actions={<Button onClick={openCreate}>اتصال حساب جدید</Button>}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جست‌وجوی حساب، سازمان یا شبکه..."
          className="max-w-md"
        />
        <p className="text-sm text-muted-foreground">
          {formatPersianNumber(filtered.length)} حساب
        </p>
      </div>

      {filtered.length === 0 ? (
        <MediaEmptyState
          title="هنوز حسابی متصل نشده است"
          description="برای شروع انتشار چندشبکه‌ای، اولین حساب رسمی سازمان را متصل کنید."
          actionLabel="اتصال حساب جدید"
          onAction={openCreate}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((account) => (
            <Card key={account.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">{account.accountName}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {getMediaPlatformLabel(account.platform)} · {account.organizationName || "—"}
                  </p>
                </div>
                <MediaAccountStatusBadge status={account.status} />
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>
                    آخرین همگام‌سازی:{" "}
                    {account.lastSyncedAt
                      ? new Intl.DateTimeFormat("fa-IR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(account.lastSyncedAt))
                      : "—"}
                  </span>
                  <span>
                    آخرین انتشار موفق:{" "}
                    {account.lastPublishedAt
                      ? new Intl.DateTimeFormat("fa-IR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(account.lastPublishedAt))
                      : "—"}
                  </span>
                  <span>خطاهای اخیر: {formatPersianNumber(account.recentErrorCount)}</span>
                  <span>
                    انتشار مرکزی: {account.allowsCentralPublish ? "فعال" : "غیرفعال"}
                  </span>
                  <span>
                    تأیید محلی: {account.requiresLocalApproval ? "لازم" : "لازم نیست"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {account.activePermissions.map((perm) => (
                    <span
                      key={perm}
                      className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {MEDIA_ACCOUNT_PERMISSION_LABELS[perm]}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(account)}>
                    ویرایش
                  </Button>
                  {account.status !== "connected" && (
                    <Button size="sm" variant="secondary" onClick={() => reconnect(account.id)}>
                      اتصال مجدد
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => setDeleteId(account.id)}>
                    حذف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "ویرایش حساب" : "اتصال حساب جدید"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>شبکه</Label>
              <Select
                value={form.platform}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, platform: value as MediaPlatformId }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEDIA_PLATFORMS.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id}>
                      {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>نام حساب</Label>
              <Input
                value={form.accountName}
                onChange={(e) => setForm((prev) => ({ ...prev, accountName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>سازمان مالک</Label>
              <Input
                value={form.organizationName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, organizationName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>وضعیت اتصال</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, status: value as MediaAccountStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MEDIA_ACCOUNT_STATUS_LABELS) as MediaAccountStatus[]).map(
                    (status) => (
                      <SelectItem key={status} value={status}>
                        {MEDIA_ACCOUNT_STATUS_LABELS[status]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>امکان انتشار مرکزی</Label>
              <Switch
                checked={form.allowsCentralPublish}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, allowsCentralPublish: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>نیاز به تأیید محلی</Label>
              <Switch
                checked={form.requiresLocalApproval}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, requiresLocalApproval: checked }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>مجوزهای فعال</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {ALL_PERMISSIONS.map((perm) => {
                  const checked = form.activePermissions.includes(perm);
                  return (
                    <label
                      key={perm}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setForm((prev) => ({
                            ...prev,
                            activePermissions: e.target.checked
                              ? [...prev.activePermissions, perm]
                              : prev.activePermissions.filter((p) => p !== perm),
                          }));
                        }}
                      />
                      {MEDIA_ACCOUNT_PERMISSION_LABELS[perm]}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(next) => !next && setDeleteId(null)}
        title="حذف حساب"
        description="این حساب از میز فرمان حذف می‌شود. ادامه می‌دهید؟"
        onConfirm={remove}
      />
    </MediaCommandShell>
  );
}
