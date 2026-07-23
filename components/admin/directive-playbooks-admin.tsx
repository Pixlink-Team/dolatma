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
import {
  createPlaybookFromDirectiveAction,
  deletePlaybookAction,
  listPlaybooksAction,
  savePlaybookAction,
} from "@/lib/actions/directive-smart-actions";
import {
  PLAYBOOK_PATTERN_LABELS,
  PLAYBOOK_PATTERN_TYPES,
  type PlaybookPatternType,
} from "@/lib/directive-smart";
import type { DirectivePlaybook } from "@/lib/db/repository-directive-smart";
import { formatPersianDateTime, formatPersianNumber } from "@/lib/utils";

interface DirectivePlaybooksAdminProps {
  sourceDirectiveId?: string | null;
}

export function DirectivePlaybooksAdmin({
  sourceDirectiveId = null,
}: DirectivePlaybooksAdminProps) {
  const [playbooks, setPlaybooks] = useState<DirectivePlaybook[]>([]);
  const [isPending, startTransition] = useTransition();
  const [patternType, setPatternType] = useState<PlaybookPatternType>("service_info");
  const [title, setTitle] = useState("");
  const [successScore, setSuccessScore] = useState("");
  const [kpiMet, setKpiMet] = useState<"unknown" | "yes" | "no">("unknown");
  const [filterType, setFilterType] = useState<PlaybookPatternType | "all">("all");

  const reload = (pattern?: PlaybookPatternType | null) => {
    startTransition(async () => {
      const result = await listPlaybooksAction({
        patternType: pattern === undefined ? (filterType === "all" ? null : filterType) : pattern,
        limit: 50,
      });
      if (!result.success) {
        toast.error(result.error ?? "بارگذاری الگوها ناموفق بود");
        return;
      }
      setPlaybooks(result.playbooks);
    });
  };

  useEffect(() => {
    reload(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsedScore = () => {
    const trimmed = successScore.trim();
    if (!trimmed) return null;
    const value = Number(trimmed);
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(100, value));
  };

  const parsedKpi = () => {
    if (kpiMet === "yes") return true;
    if (kpiMet === "no") return false;
    return null;
  };

  const save = () => {
    if (!title.trim()) {
      toast.error("عنوان الزامی است");
      return;
    }
    startTransition(async () => {
      const result = await savePlaybookAction({
        patternType,
        title: title.trim(),
        sourceDirectiveId,
        successScore: parsedScore(),
        kpiMet: parsedKpi(),
      });
      if (!result.success) {
        toast.error(result.error ?? "ذخیره نشد");
        return;
      }
      toast.success("الگو ذخیره شد");
      setTitle("");
      setSuccessScore("");
      setKpiMet("unknown");
      reload(filterType === "all" ? null : filterType);
    });
  };

  const saveFromDirective = () => {
    if (!sourceDirectiveId) {
      toast.error("دستورکار مبدأ مشخص نیست");
      return;
    }
    startTransition(async () => {
      const result = await createPlaybookFromDirectiveAction({
        directiveId: sourceDirectiveId,
        patternType,
        title: title.trim() || undefined,
        successScore: parsedScore(),
        kpiMet: parsedKpi(),
      });
      if (!result.success) {
        toast.error(result.error ?? "ساخت الگو ناموفق بود");
        return;
      }
      toast.success("الگو از دستورکار ساخته شد");
      setTitle("");
      setSuccessScore("");
      setKpiMet("unknown");
      reload(filterType === "all" ? null : filterType);
    });
  };

  const remove = (id: string) => {
    if (!window.confirm("این الگو حذف شود؟")) return;
    startTransition(async () => {
      const result = await deletePlaybookAction(id);
      if (!result.success) {
        toast.error(result.error ?? "حذف نشد");
        return;
      }
      setPlaybooks((prev) => prev.filter((item) => item.id !== id));
      toast.success("حذف شد");
    });
  };

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <div>
        <h3 className="font-semibold">کتابخانه الگو (Playbook)</h3>
        <p className="text-sm text-muted-foreground">
          الگوهای قابل‌استفاده مجدد برای طراحی دستورکارهای مشابه
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>نوع الگو</Label>
          <Select
            value={patternType}
            onValueChange={(value) => setPatternType(value as PlaybookPatternType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAYBOOK_PATTERN_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {PLAYBOOK_PATTERN_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>عنوان</Label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="عنوان الگو"
          />
        </div>
        <div className="space-y-2">
          <Label>امتیاز موفقیت (۰ تا ۱۰۰)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={successScore}
            onChange={(event) => setSuccessScore(event.target.value)}
            placeholder="اختیاری"
          />
        </div>
        <div className="space-y-2">
          <Label>رسیدن به KPI</Label>
          <Select
            value={kpiMet}
            onValueChange={(value) => setKpiMet(value as "unknown" | "yes" | "no")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unknown">نامشخص</SelectItem>
              <SelectItem value="yes">بله</SelectItem>
              <SelectItem value="no">خیر</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="button" disabled={isPending} onClick={save}>
            ذخیره الگو
          </Button>
          {sourceDirectiveId ? (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={saveFromDirective}
            >
              ساخت از دستورکار جاری
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label>فیلتر</Label>
        <Select
          value={filterType}
          onValueChange={(value) => {
            const next = value as PlaybookPatternType | "all";
            setFilterType(next);
            reload(next === "all" ? null : next);
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه</SelectItem>
            {PLAYBOOK_PATTERN_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {PLAYBOOK_PATTERN_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {playbooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">الگویی ثبت نشده است.</p>
      ) : (
        <ul className="space-y-2">
          {playbooks.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {PLAYBOOK_PATTERN_LABELS[item.patternType]} ·{" "}
                  {formatPersianDateTime(item.createdAt)}
                  {item.successScore != null
                    ? ` · امتیاز ${formatPersianNumber(item.successScore)}`
                    : ""}
                  {item.kpiMet === true
                    ? " · KPI محقق"
                    : item.kpiMet === false
                      ? " · KPI نامحقق"
                      : ""}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isPending}
                onClick={() => remove(item.id)}
              >
                حذف
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
