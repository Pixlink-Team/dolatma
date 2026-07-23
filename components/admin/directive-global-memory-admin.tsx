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
  listGlobalMemoryAction,
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

interface DirectiveGlobalMemoryAdminProps {
  campaignId?: string | null;
}

export function DirectiveGlobalMemoryAdmin({
  campaignId = null,
}: DirectiveGlobalMemoryAdminProps) {
  const [entries, setEntries] = useState<DirectiveMemoryEntry[]>([]);
  const [isPending, startTransition] = useTransition();
  const [layer, setLayer] = useState<DirectiveMemoryLayer>("strategic");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const reload = () => {
    startTransition(async () => {
      const result = await listGlobalMemoryAction({ limit: 100 });
      if (!result.success) {
        toast.error(result.error ?? "بارگذاری حافظه سراسری ناموفق بود");
        return;
      }
      setEntries(result.entries);
    });
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveEntry = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("عنوان و متن الزامی است");
      return;
    }
    startTransition(async () => {
      const result = await saveDirectiveMemoryAction({
        campaignId: campaignId ?? undefined,
        layer,
        title: title.trim(),
        body: body.trim(),
        isGlobal: true,
      });
      if (!result.success) {
        toast.error(result.error ?? "ذخیره نشد");
        return;
      }
      toast.success("ورود حافظه سراسری ثبت شد");
      setTitle("");
      setBody("");
      setEntries((prev) => [result.entry, ...prev]);
    });
  };

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <div>
        <h3 className="font-semibold">حافظه ارتباطی سراسری</h3>
        <p className="text-sm text-muted-foreground">
          فقط ادمین سیستم می‌تواند این آرشیو را ببیند و ویرایش کند
        </p>
      </div>

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
          افزودن به حافظه سراسری
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">هنوز مورد سراسری ثبت نشده است.</p>
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
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{entry.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
