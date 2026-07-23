"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  extractMemoryAction,
  listDirectiveMemoryAction,
  saveDirectiveMemoryAction,
} from "@/lib/actions/directive-smart-actions";
import type {
  DirectiveMemoryEntry,
  DirectiveMemoryLayer,
} from "@/lib/db/repository-directive-smart";
import { formatPersianDateTime } from "@/lib/utils";

const MEMORY_LAYERS = [
  "strategic",
  "operational",
  "content",
  "media",
  "audience",
  "failure",
  "success",
] as const satisfies readonly DirectiveMemoryLayer[];

const LAYER_LABELS: Record<DirectiveMemoryLayer, string> = {
  strategic: "راهبردی",
  operational: "عملیاتی",
  content: "محتوا",
  media: "رسانه",
  audience: "مخاطب",
  failure: "شکست",
  success: "موفقیت",
};

interface DirectiveMemoryPanelProps {
  directiveId: string;
  campaignId: string;
  isFullAdmin?: boolean;
}

export function DirectiveMemoryPanel({
  directiveId,
  campaignId,
  isFullAdmin = false,
}: DirectiveMemoryPanelProps) {
  const [entries, setEntries] = useState<DirectiveMemoryEntry[]>([]);
  const [isPending, startTransition] = useTransition();
  const [layer, setLayer] = useState<DirectiveMemoryLayer>("operational");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const reload = () => {
    startTransition(async () => {
      const result = await listDirectiveMemoryAction(directiveId);
      if (!result.success) {
        toast.error(result.error ?? "بارگذاری حافظه ناموفق بود");
        return;
      }
      setEntries(result.entries);
    });
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directiveId]);

  const saveEntry = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("عنوان و متن الزامی است");
      return;
    }
    startTransition(async () => {
      const result = await saveDirectiveMemoryAction({
        directiveId,
        campaignId,
        layer,
        title: title.trim(),
        body: body.trim(),
      });
      if (!result.success) {
        toast.error(result.error ?? "ذخیره نشد");
        return;
      }
      toast.success("ورود حافظه ثبت شد");
      setTitle("");
      setBody("");
      setEntries((prev) => [result.entry, ...prev]);
    });
  };

  const extract = () => {
    startTransition(async () => {
      const result = await extractMemoryAction({ directiveId });
      if (!result.success) {
        toast.error(result.error ?? "استخراج ناموفق بود");
        return;
      }
      toast.success(`${result.entries.length} مورد استخراج شد`);
      reload();
    });
  };

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">دانش استخراج‌شده</h3>
          <p className="text-sm text-muted-foreground">
            نکات قابل بایگانی برای این دستورکار
          </p>
        </div>
        <Button type="button" variant="outline" disabled={isPending} onClick={extract}>
          استخراج با AI
        </Button>
      </div>

      {isFullAdmin ? (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          آرشیو سراسری حافظه فقط برای ادمین کامل در بخش مدیریت الگوها/تنظیمات در دسترس است.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          بایگانی سراسری فقط برای ادمین سیستم در دسترس است.
        </p>
      )}

      <div className="space-y-3 rounded-xl border p-4">
        <div className="space-y-2">
          <Label>لایه</Label>
          <Select
            value={layer}
            onValueChange={(value) => setLayer(value as DirectiveMemoryLayer)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMORY_LAYERS.map((item) => (
                <SelectItem key={item} value={item}>
                  {LAYER_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>عنوان</Label>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>متن</Label>
          <Textarea rows={3} value={body} onChange={(event) => setBody(event.target.value)} />
        </div>
        <Button type="button" disabled={isPending} onClick={saveEntry}>
          افزودن ورود
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">هنوز دانشی ثبت نشده است.</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{entry.title}</p>
                <span className="text-xs text-muted-foreground">
                  {LAYER_LABELS[entry.layer]} · {formatPersianDateTime(entry.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{entry.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
