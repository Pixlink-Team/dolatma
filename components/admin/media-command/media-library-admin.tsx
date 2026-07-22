"use client";

import { useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { MEDIA_LIBRARY_CATEGORY_LABELS } from "@/lib/media-command/labels";
import type { MediaLibraryCategory, MediaLibraryItem } from "@/lib/media-command/types";
import { upsertMediaLibraryItemAction } from "@/lib/actions/media-command-actions";

interface Props {
  campaignId: string;
  items: MediaLibraryItem[];
}

export function MediaLibraryAdmin({ campaignId, items: initial }: Props) {
  const [items] = useState(initial);
  const [category, setCategory] = useState<MediaLibraryCategory | "all">("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "approved_messages" as MediaLibraryCategory,
    versionLabel: "1",
    bodyText: "",
    validUntil: "",
    accessLevel: "campaign" as "public" | "campaign" | "restricted",
    canEdit: true,
    canPublish: true,
  });

  const filtered = useMemo(() => {
    if (category === "all") return items;
    return items.filter((item) => item.category === category);
  }, [items, category]);

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("عنوان را وارد کنید");
      return;
    }
    setSaving(true);
    const result = await upsertMediaLibraryItemAction({
      campaignId,
      title: form.title,
      category: form.category,
      versionLabel: form.versionLabel,
      bodyText: form.bodyText,
      validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
      accessLevel: form.accessLevel,
      canEdit: form.canEdit,
      canPublish: form.canPublish,
      suitablePlatforms: [],
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error ?? "ذخیره ناموفق بود");
      return;
    }
    toast.success("آیتم کتابخانه ذخیره شد");
    setOpen(false);
    window.location.reload();
  };

  return (
    <MediaCommandShell
      campaignId={campaignId}
      title="کتابخانه محتوا"
      description="مخزن مرکزی پیام‌های مصوب، فایل‌های رسمی و پاسخ‌های تأییدشده"
      actions={<Button onClick={() => setOpen(true)}>افزودن به کتابخانه</Button>}
    >
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={category === "all" ? "default" : "outline"}
          onClick={() => setCategory("all")}
        >
          همه
        </Button>
        {(Object.keys(MEDIA_LIBRARY_CATEGORY_LABELS) as MediaLibraryCategory[]).map((key) => (
          <Button
            key={key}
            size="sm"
            variant={category === key ? "default" : "outline"}
            onClick={() => setCategory(key)}
          >
            {MEDIA_LIBRARY_CATEGORY_LABELS[key]}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <MediaEmptyState
          title="کتابخانه خالی است"
          description="پیام‌های مصوب، FAQ و فایل‌های قابل انتشار را اینجا نگه دارید."
          actionLabel="افزودن اولین آیتم"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((item) => {
            const expired = item.validUntil ? new Date(item.validUntil) < new Date() : false;
            return (
              <Card key={item.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      نسخه {item.versionLabel} · {MEDIA_LIBRARY_CATEGORY_LABELS[item.category]}
                    </p>
                  </div>
                  {expired ? (
                    <Badge variant="destructive">منقضی‌شده</Badge>
                  ) : (
                    <Badge variant="secondary">معتبر</Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="line-clamp-3 text-muted-foreground">{item.bodyText || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    انتشار: {item.canPublish ? "مجاز" : "غیرمجاز"} · ویرایش:{" "}
                    {item.canEdit ? "مجاز" : "غیرمجاز"} · استفاده: {item.usageCount}
                  </p>
                  {expired && (
                    <p className="text-xs text-destructive">
                      این محتوا منقضی شده و نباید بدون هشدار مجدداً منتشر شود.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>آیتم جدید کتابخانه</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>عنوان</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>دسته</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, category: v as MediaLibraryCategory }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MEDIA_LIBRARY_CATEGORY_LABELS) as MediaLibraryCategory[]).map(
                    (key) => (
                      <SelectItem key={key} value={key}>
                        {MEDIA_LIBRARY_CATEGORY_LABELS[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>متن / پیام</Label>
              <Textarea
                rows={4}
                value={form.bodyText}
                onChange={(e) => setForm((p) => ({ ...p, bodyText: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>اعتبار تا</Label>
              <Input
                type="datetime-local"
                value={form.validUntil}
                onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button onClick={save} disabled={saving}>
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MediaCommandShell>
  );
}
