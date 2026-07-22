"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MediaCommandShell } from "@/components/admin/media-command/media-command-shell";
import { MediaEmptyState } from "@/components/admin/media-command/media-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MEDIA_PLATFORMS } from "@/lib/media-command/platforms";
import {
  MEDIA_ORDER_MODE_LABELS,
  MEDIA_ORDER_STATUS_LABELS,
} from "@/lib/media-command/labels";
import type {
  MediaAccount,
  MediaPublishOrder,
  MediaPublishOrderMode,
  MediaPublishOrderStatus,
} from "@/lib/media-command/types";
import type { MediaPlatformId } from "@/lib/media-command/platforms";
import { upsertMediaOrderAction } from "@/lib/actions/media-command-actions";

interface Props {
  campaignId: string;
  orders: MediaPublishOrder[];
  accounts: MediaAccount[];
}

export function MediaOrdersAdmin({ campaignId, orders: initial, accounts }: Props) {
  const [orders] = useState(initial);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    objective: "",
    mainMessage: "",
    approvedContent: "",
    mode: "content_mission" as MediaPublishOrderMode,
    status: "sent" as MediaPublishOrderStatus,
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    sensitivityLevel: "medium" as "low" | "medium" | "high" | "critical",
    targetPlatforms: [] as MediaPlatformId[],
    targetAccountIds: [] as string[],
    targetProvinces: "",
    publishAt: "",
    deadlineAt: "",
    allowsLocalization: true,
    requiresLocalApproval: true,
    expectedEvidence: "",
  });

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("عنوان دستور را وارد کنید");
      return;
    }
    setSaving(true);
    const result = await upsertMediaOrderAction({
      campaignId,
      title: form.title,
      objective: form.objective,
      mainMessage: form.mainMessage,
      approvedContent: form.approvedContent,
      mode: form.mode,
      status: form.status,
      priority: form.priority,
      sensitivityLevel: form.sensitivityLevel,
      targetPlatforms: form.targetPlatforms,
      targetAccountIds: form.targetAccountIds,
      targetProvinces: form.targetProvinces
        .split(/[،,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : null,
      deadlineAt: form.deadlineAt ? new Date(form.deadlineAt).toISOString() : null,
      allowsLocalization: form.allowsLocalization,
      requiresLocalApproval: form.requiresLocalApproval,
      expectedEvidence: form.expectedEvidence,
      referenceUrls: [],
      suggestedVariants: {},
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error ?? "ذخیره ناموفق بود");
      return;
    }
    toast.success("دستور انتشار ثبت شد");
    setOpen(false);
    window.location.reload();
  };

  return (
    <MediaCommandShell
      campaignId={campaignId}
      title="دستورهای انتشار"
      description="اتصال دستورکار و کمپین به اجرای رسانه‌ای دستگاه‌ها"
      actions={<Button onClick={() => setOpen(true)}>دستور انتشار جدید</Button>}
    >
      {orders.length === 0 ? (
        <MediaEmptyState
          title="هنوز دستور انتشاری دریافت نشده است"
          description="برای دستگاه‌ها دستور انتشار، بسته محتوا یا مأموریت محتوایی تعریف کنید."
          actionLabel="ثبت دستور جدید"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">{order.title}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{order.objective || "—"}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">{MEDIA_ORDER_MODE_LABELS[order.mode]}</Badge>
                  <Badge>{MEDIA_ORDER_STATUS_LABELS[order.status]}</Badge>
                  {order.priority === "urgent" && <Badge variant="destructive">فوری</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground line-clamp-2">{order.mainMessage}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>دستورکار: {order.directiveTitle ?? "—"}</span>
                  <span>
                    مهلت:{" "}
                    {order.deadlineAt
                      ? new Intl.DateTimeFormat("fa-IR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(order.deadlineAt))
                      : "—"}
                  </span>
                  <span>استان‌ها: {order.targetProvinces.join("، ") || "—"}</span>
                  <span>
                    بومی‌سازی: {order.allowsLocalization ? "مجاز" : "غیرمجاز"} · تأیید محلی:{" "}
                    {order.requiresLocalApproval ? "لازم" : "لازم نیست"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>دستور انتشار جدید</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>عنوان</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>هدف</Label>
              <Textarea
                rows={2}
                value={form.objective}
                onChange={(e) => setForm((p) => ({ ...p, objective: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>پیام اصلی</Label>
              <Textarea
                rows={3}
                value={form.mainMessage}
                onChange={(e) => setForm((p) => ({ ...p, mainMessage: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>محتوای مصوب</Label>
              <Textarea
                rows={3}
                value={form.approvedContent}
                onChange={(e) => setForm((p) => ({ ...p, approvedContent: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>مدل انتشار</Label>
              <Select
                value={form.mode}
                onValueChange={(v) => setForm((p) => ({ ...p, mode: v as MediaPublishOrderMode }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MEDIA_ORDER_MODE_LABELS) as MediaPublishOrderMode[]).map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {MEDIA_ORDER_MODE_LABELS[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اولویت</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    priority: v as "low" | "normal" | "high" | "urgent",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">کم</SelectItem>
                  <SelectItem value="normal">عادی</SelectItem>
                  <SelectItem value="high">بالا</SelectItem>
                  <SelectItem value="urgent">فوری</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>زمان انتشار</Label>
              <Input
                type="datetime-local"
                value={form.publishAt}
                onChange={(e) => setForm((p) => ({ ...p, publishAt: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>مهلت انجام</Label>
              <Input
                type="datetime-local"
                value={form.deadlineAt}
                onChange={(e) => setForm((p) => ({ ...p, deadlineAt: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>استان‌های هدف (با ویرگول)</Label>
              <Input
                value={form.targetProvinces}
                onChange={(e) => setForm((p) => ({ ...p, targetProvinces: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>شبکه‌های مقصد</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {MEDIA_PLATFORMS.map((platform) => {
                  const checked = form.targetPlatforms.includes(platform.id);
                  return (
                    <label key={platform.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            targetPlatforms: e.target.checked
                              ? [...p.targetPlatforms, platform.id]
                              : p.targetPlatforms.filter((id) => id !== platform.id),
                          }))
                        }
                      />
                      {platform.label}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>حساب‌های هدف</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {accounts.map((account) => {
                  const checked = form.targetAccountIds.includes(account.id);
                  return (
                    <label key={account.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            targetAccountIds: e.target.checked
                              ? [...p.targetAccountIds, account.id]
                              : p.targetAccountIds.filter((id) => id !== account.id),
                          }))
                        }
                      />
                      {account.accountName}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>مدرک مورد انتظار</Label>
              <Input
                value={form.expectedEvidence}
                onChange={(e) => setForm((p) => ({ ...p, expectedEvidence: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>امکان بومی‌سازی</Label>
              <Switch
                checked={form.allowsLocalization}
                onCheckedChange={(checked) =>
                  setForm((p) => ({ ...p, allowsLocalization: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>نیاز به تأیید محلی</Label>
              <Switch
                checked={form.requiresLocalApproval}
                onCheckedChange={(checked) =>
                  setForm((p) => ({ ...p, requiresLocalApproval: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "در حال ذخیره..." : "ثبت دستور"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MediaCommandShell>
  );
}
