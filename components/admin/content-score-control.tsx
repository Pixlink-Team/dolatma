"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveContentScoreAction } from "@/lib/actions/score-actions";
import type { ScoreableContentType } from "@/lib/types";
import { formatPersianNumber } from "@/lib/utils";

interface ContentScoreControlProps {
  campaignId: string;
  contentType: ScoreableContentType;
  contentId: string;
  score: number | null | undefined;
  canScore: boolean;
  onScoreSaved?: (score: number | null) => void;
  compact?: boolean;
}

export function ContentScoreControl({
  campaignId,
  contentType,
  contentId,
  score,
  canScore,
  onScoreSaved,
  compact = false,
}: ContentScoreControlProps) {
  const [value, setValue] = useState(score != null ? String(score) : "");
  const [isPending, startTransition] = useTransition();

  if (!canScore && (score == null || Number.isNaN(score))) return null;

  if (!canScore) {
    return (
      <div className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-400">
        <Star className="h-3 w-3 fill-current" />
        امتیاز: {formatPersianNumber(score ?? 0)}
      </div>
    );
  }

  const handleSave = () => {
    const parsed = value.trim() === "" ? null : Number(value);
    if (parsed != null && (!Number.isFinite(parsed) || parsed < 0)) {
      toast.error("امتیاز باید عدد معتبر باشد");
      return;
    }

    startTransition(async () => {
      const result = await saveContentScoreAction({
        campaignId,
        contentType,
        contentId,
        score: parsed,
      });
      if (!result.success) {
        toast.error(result.error ?? "ذخیره امتیاز ناموفق بود");
        return;
      }
      onScoreSaved?.(parsed);
      toast.success("امتیاز ذخیره شد");
    });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Star className="h-3.5 w-3.5 text-amber-500" />
        <Input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 w-16 px-1 text-xs"
          dir="ltr"
          placeholder="—"
        />
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[10px]" disabled={isPending} onClick={handleSave}>
          ذخیره
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3" onClick={(e) => e.stopPropagation()}>
      <Label className="flex items-center gap-1.5 text-sm">
        <Star className="h-3.5 w-3.5 text-amber-500" />
        امتیازدهی (فقط مدیر و کارفرما)
      </Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          dir="ltr"
          placeholder="عدد امتیاز"
          className="max-w-[140px]"
        />
        <Button type="button" disabled={isPending} onClick={handleSave}>
          ذخیره امتیاز
        </Button>
      </div>
    </div>
  );
}
