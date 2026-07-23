"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  generateActionSuggestionsAction,
  listMyAiSuggestionsAction,
  updateAiSuggestionStatusAction,
} from "@/lib/actions/directive-smart-actions";
import {
  AI_ACTION_REJECT_REASON_LABELS,
  AI_ACTION_REJECT_REASONS,
  type AiActionRejectReason,
  type AiActionStatus,
} from "@/lib/directive-smart";
import type { DirectiveAiSuggestion } from "@/lib/db/repository-directive-smart";
import { formatPersianNumber } from "@/lib/utils";

const STATUS_LABELS: Record<AiActionStatus, string> = {
  suggested: "پیشنهاد شده",
  accepted: "پذیرفته",
  in_progress: "در حال انجام",
  evidence_submitted: "مدرک ارسال شد",
  approved: "تأیید شده",
  done: "انجام شد",
  rejected: "رد شده",
};

interface AiActionAssistantPanelProps {
  directiveId: string;
  canManage: boolean;
}

export function AiActionAssistantPanel({
  directiveId,
  canManage,
}: AiActionAssistantPanelProps) {
  const [suggestions, setSuggestions] = useState<DirectiveAiSuggestion[]>([]);
  const [isPending, startTransition] = useTransition();
  const [rejectTarget, setRejectTarget] = useState<DirectiveAiSuggestion | null>(null);
  const [rejectReason, setRejectReason] = useState<AiActionRejectReason>("other");
  const [rejectNote, setRejectNote] = useState("");
  const [requestAlternative, setRequestAlternative] = useState(true);
  const [evidenceTarget, setEvidenceTarget] = useState<DirectiveAiSuggestion | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");

  const loadSuggestions = () => {
    startTransition(async () => {
      const result = await listMyAiSuggestionsAction(directiveId);
      if (!result.success) {
        toast.error(result.error ?? "بارگذاری پیشنهادها ناموفق بود");
        return;
      }
      setSuggestions(result.suggestions.slice(0, 5));
    });
  };

  useEffect(() => {
    loadSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per directive
  }, [directiveId]);

  const generateToday = () => {
    startTransition(async () => {
      const result = await generateActionSuggestionsAction(directiveId);
      if (!result.success) {
        toast.error(result.error ?? "تولید پیشنهاد ناموفق بود");
        return;
      }
      if (result.skipped) {
        toast.message("سقف پیشنهادهای باز امروز پر است؛ همان موارد نمایش داده شد");
      } else {
        toast.success("پیشنهادهای امروز تولید شد");
      }
      const mine = result.suggestions.slice(0, 5);
      setSuggestions(mine.length > 0 ? mine : result.suggestions.slice(0, 5));
      if (mine.length === 0) loadSuggestions();
    });
  };

  const updateStatus = (
    id: string,
    status: AiActionStatus,
    extra?: {
      rejectReason?: AiActionRejectReason | null;
      rejectNote?: string | null;
      evidenceUrl?: string | null;
      evidenceNote?: string | null;
      requestAlternative?: boolean;
    }
  ) => {
    startTransition(async () => {
      const result = await updateAiSuggestionStatusAction({
        id,
        status,
        ...extra,
      });
      if (!result.success) {
        toast.error(result.error ?? "به‌روزرسانی ناموفق بود");
        return;
      }
      toast.success("وضعیت به‌روز شد");
      setSuggestions((prev) => {
        const next = prev.map((item) => (item.id === id ? result.suggestion : item));
        if (result.alternative) {
          return [result.alternative, ...next].slice(0, 5);
        }
        return next;
      });
      setRejectTarget(null);
      setEvidenceTarget(null);
      setRejectNote("");
      setEvidenceUrl("");
      setEvidenceNote("");
    });
  };

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">دستیار اقدام</h3>
          <p className="text-sm text-muted-foreground">
            پیشنهادهای عملی روزانه بر اساس دستورکار هوشمند
          </p>
        </div>
        <Button type="button" onClick={generateToday} disabled={isPending}>
          پیشنهادهای امروز
        </Button>
      </div>

      {suggestions.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          هنوز پیشنهادی ندارید. دکمه «پیشنهادهای امروز» را بزنید.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {suggestions.slice(0, 5).map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <Badge variant="outline">{STATUS_LABELS[item.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {item.description ? <p>{item.description}</p> : null}
                {item.reason ? (
                  <p className="text-muted-foreground">دلیل: {item.reason}</p>
                ) : null}
                {item.linkedGoal ? (
                  <p className="text-muted-foreground">هدف مرتبط: {item.linkedGoal}</p>
                ) : null}
                {item.evidenceRequired ? (
                  <p className="text-muted-foreground">مدرک لازم: {item.evidenceRequired}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  اطمینان: {formatPersianNumber(Math.round(item.confidence * 100))}٪
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {item.status === "suggested" ? (
                    <Button
                      size="sm"
                      type="button"
                      disabled={isPending}
                      onClick={() => updateStatus(item.id, "accepted")}
                    >
                      پذیرش
                    </Button>
                  ) : null}
                  {item.status === "accepted" || item.status === "suggested" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      disabled={isPending}
                      onClick={() => updateStatus(item.id, "in_progress")}
                    >
                      شروع
                    </Button>
                  ) : null}
                  {item.status === "in_progress" || item.status === "accepted" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      disabled={isPending}
                      onClick={() => setEvidenceTarget(item)}
                    >
                      ارسال مدرک
                    </Button>
                  ) : null}
                  {canManage && item.status === "evidence_submitted" ? (
                    <Button
                      size="sm"
                      type="button"
                      disabled={isPending}
                      onClick={() => updateStatus(item.id, "approved")}
                    >
                      تأیید
                    </Button>
                  ) : null}
                  {(item.status === "approved" ||
                    item.status === "in_progress" ||
                    item.status === "evidence_submitted") && (
                    <Button
                      size="sm"
                      variant="secondary"
                      type="button"
                      disabled={isPending}
                      onClick={() => updateStatus(item.id, "done")}
                    >
                      انجام شد
                    </Button>
                  )}
                  {item.status !== "done" && item.status !== "rejected" ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setRejectTarget(item);
                        setRejectReason("other");
                        setRequestAlternative(true);
                      }}
                    >
                      رد
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => !open && setRejectTarget(null)}
      >
        <DialogContent dir="rtl" className="text-right">
          <DialogHeader>
            <DialogTitle>رد پیشنهاد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>دلیل</Label>
              <Select
                value={rejectReason}
                onValueChange={(value) => setRejectReason(value as AiActionRejectReason)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_ACTION_REJECT_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {AI_ACTION_REJECT_REASON_LABELS[reason]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>توضیح</Label>
              <Textarea
                rows={3}
                value={rejectNote}
                onChange={(event) => setRejectNote(event.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requestAlternative}
                onChange={(event) => setRequestAlternative(event.target.checked)}
              />
              پیشنهاد جایگزین بساز
            </label>
            <Button
              type="button"
              disabled={isPending || !rejectTarget}
              onClick={() => {
                if (!rejectTarget) return;
                updateStatus(rejectTarget.id, "rejected", {
                  rejectReason,
                  rejectNote,
                  requestAlternative,
                });
              }}
            >
              ثبت رد
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(evidenceTarget)}
        onOpenChange={(open) => !open && setEvidenceTarget(null)}
      >
        <DialogContent dir="rtl" className="text-right">
          <DialogHeader>
            <DialogTitle>ارسال مدرک</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>آدرس مدرک (URL)</Label>
              <Input
                value={evidenceUrl}
                onChange={(event) => setEvidenceUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>توضیح مدرک</Label>
              <Textarea
                rows={3}
                value={evidenceNote}
                onChange={(event) => setEvidenceNote(event.target.value)}
              />
            </div>
            <Button
              type="button"
              disabled={isPending || !evidenceTarget}
              onClick={() => {
                if (!evidenceTarget) return;
                updateStatus(evidenceTarget.id, "evidence_submitted", {
                  evidenceUrl: evidenceUrl.trim() || null,
                  evidenceNote: evidenceNote.trim() || null,
                });
              }}
            >
              ثبت مدرک
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
