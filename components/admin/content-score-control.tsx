"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BookMarked, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { suggestBestPracticeAction } from "@/lib/actions/best-practice-actions";
import { saveContentScoreAction } from "@/lib/actions/score-actions";
import { BEST_PRACTICE_SCORE_SUGGEST_THRESHOLD } from "@/lib/command-feature-labels";
import { parseScoreInput } from "@/lib/content-score";
import type { ScoreableContentType } from "@/lib/types";
import { formatPersianNumber } from "@/lib/utils";

interface ContentScoreControlProps {
  campaignId: string;
  contentType: ScoreableContentType;
  contentId: string;
  score: number | null | undefined;
  canScore: boolean;
  contentTitle?: string;
  onScoreSaved?: (score: number | null) => void;
  compact?: boolean;
}

function scoreToInputValue(score: number | null | undefined): string {
  return typeof score === "number" && Number.isFinite(score) ? String(score) : "";
}

export function ContentScoreControl({
  campaignId,
  contentType,
  contentId,
  score,
  canScore,
  contentTitle,
  onScoreSaved,
  compact = false,
}: ContentScoreControlProps) {
  const [value, setValue] = useState(() => scoreToInputValue(score));
  const [isPending, startTransition] = useTransition();
  const lastSavedRef = useRef(scoreToInputValue(score));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const next = scoreToInputValue(score);
    setValue(next);
    lastSavedRef.current = next;
  }, [score, contentId]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Contributors and anonymous users: show score only when set (including 0).
  if (!canScore) {
    if (typeof score !== "number" || !Number.isFinite(score)) return null;
    return (
      <div className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-1 text-xs text-warning">
        <Star className="h-3 w-3 fill-current" />
        امتیاز: {formatPersianNumber(score)}
      </div>
    );
  }

  const persist = (raw: string) => {
    if (raw === lastSavedRef.current) return;

    const parsed = parseScoreInput(raw);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }

    startTransition(async () => {
      const result = await saveContentScoreAction({
        campaignId,
        contentType,
        contentId,
        score: parsed.value,
      });
      if (!result.success) {
        toast.error(result.error ?? "ذخیره امتیاز ناموفق بود");
        return;
      }
      lastSavedRef.current = raw;
      onScoreSaved?.(parsed.value);
    });
  };

  const scheduleSave = (raw: string) => {
    setValue(raw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persist(raw), 500);
  };

  const numericScore =
    typeof score === "number" && Number.isFinite(score) ? score : Number(value);
  const canSuggest =
    Number.isFinite(numericScore) && numericScore >= BEST_PRACTICE_SCORE_SUGGEST_THRESHOLD;

  const suggestButton = canSuggest ? (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={compact ? "h-7 px-2 text-[10px]" : ""}
      disabled={isPending}
      onClick={(e) => {
        e.stopPropagation();
        startTransition(async () => {
          const result = await suggestBestPracticeAction({
            campaignId,
            contentType,
            contentId,
            title: contentTitle?.trim() || "بدون عنوان",
            suggestedScore: numericScore,
          });
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          toast.success("برای کتابخانه بهترین اقدامات پیشنهاد شد");
        });
      }}
    >
      <BookMarked className="ml-1 h-3.5 w-3.5" />
      پیشنهاد کتابخانه
    </Button>
  ) : null;

  const input = (
    <Input
      type="number"
      min={0}
      step={1}
      value={value}
      onChange={(e) => scheduleSave(e.target.value)}
      onBlur={() => persist(value)}
      dir="ltr"
      placeholder="—"
      className={compact ? "h-7 w-16 px-1 text-xs" : "max-w-[140px]"}
      disabled={isPending}
      aria-label="امتیاز"
    />
  );

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Star className="h-3.5 w-3.5 text-warning" />
        {input}
        {suggestButton}
        {isPending && <span className="text-[10px] text-muted-foreground">...</span>}
      </div>
    );
  }

  return (
    <div
      className="space-y-2 rounded-lg border border-warning/30 bg-warning/5 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <Label className="flex items-center gap-1.5 text-sm">
        <Star className="h-3.5 w-3.5 text-warning" />
        امتیازدهی (ذخیره خودکار)
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        {input}
        {suggestButton}
        {isPending && <span className="text-xs text-muted-foreground">در حال ذخیره...</span>}
      </div>
    </div>
  );
}
