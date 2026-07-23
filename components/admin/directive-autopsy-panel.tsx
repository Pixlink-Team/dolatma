"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  generateAutopsyDraftAction,
  getAutopsyAction,
  saveAutopsyAction,
} from "@/lib/actions/directive-smart-actions";

interface DirectiveAutopsyPanelProps {
  directiveId: string;
}

export function DirectiveAutopsyPanel({ directiveId }: DirectiveAutopsyPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [plannedSummary, setPlannedSummary] = useState("");
  const [actualSummary, setActualSummary] = useState("");
  const [missingSummary, setMissingSummary] = useState("");
  const [effectiveSummary, setEffectiveSummary] = useState("");
  const [ineffectiveSummary, setIneffectiveSummary] = useState("");
  const [effectProven, setEffectProven] = useState("");
  const [effectLikely, setEffectLikely] = useState("");
  const [effectNeedsData, setEffectNeedsData] = useState("");
  const [surveyJson, setSurveyJson] = useState("{\n  \n}");
  const [fileUrlsText, setFileUrlsText] = useState("");
  const [aiReport, setAiReport] = useState("");

  useEffect(() => {
    startTransition(async () => {
      const result = await getAutopsyAction(directiveId);
      if (!result.success) {
        toast.error(result.error ?? "بارگذاری کالبدشکافی ناموفق بود");
        return;
      }
      const autopsy = result.autopsy;
      if (!autopsy) return;
      setPlannedSummary(autopsy.plannedSummary);
      setActualSummary(autopsy.actualSummary);
      setMissingSummary(autopsy.missingSummary);
      setEffectiveSummary(autopsy.effectiveSummary);
      setIneffectiveSummary(autopsy.ineffectiveSummary);
      setEffectProven(autopsy.effectProven);
      setEffectLikely(autopsy.effectLikely);
      setEffectNeedsData(autopsy.effectNeedsData);
      setAiReport(autopsy.aiReport ?? "");
      setSurveyJson(JSON.stringify(autopsy.externalSurveyData ?? {}, null, 2));
      const urls = (autopsy.externalFiles ?? [])
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "url" in item) {
            return String((item as { url?: unknown }).url ?? "");
          }
          return "";
        })
        .filter(Boolean);
      setFileUrlsText(urls.join("\n"));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directiveId]);

  const parseSurvey = (): Record<string, unknown> | null => {
    const trimmed = surveyJson.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      toast.error("داده‌های نظرسنجی باید یک شیء JSON باشد");
      return null;
    } catch {
      toast.error("JSON نظرسنجی نامعتبر است");
      return null;
    }
  };

  const parseFiles = () =>
    fileUrlsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((url) => ({ url }));

  const save = () => {
    const survey = parseSurvey();
    if (survey == null) return;
    startTransition(async () => {
      const result = await saveAutopsyAction({
        directiveId,
        plannedSummary,
        actualSummary,
        missingSummary,
        effectiveSummary,
        ineffectiveSummary,
        effectProven,
        effectLikely,
        effectNeedsData,
        externalSurveyData: survey,
        externalFiles: parseFiles(),
        aiReport: aiReport || null,
      });
      if (!result.success) {
        toast.error(result.error ?? "ذخیره نشد");
        return;
      }
      toast.success("کالبدشکافی ذخیره شد");
    });
  };

  const generateDraft = () => {
    const survey = parseSurvey();
    if (survey == null) return;
    startTransition(async () => {
      const result = await generateAutopsyDraftAction({
        directiveId,
        externalSurveyData: survey,
      });
      if (!result.success) {
        toast.error(result.error ?? "تولید پیش‌نویس ناموفق بود");
        return;
      }
      const autopsy = result.autopsy;
      setPlannedSummary(autopsy.plannedSummary);
      setActualSummary(autopsy.actualSummary);
      setMissingSummary(autopsy.missingSummary);
      setEffectiveSummary(autopsy.effectiveSummary);
      setIneffectiveSummary(autopsy.ineffectiveSummary);
      setEffectProven(autopsy.effectProven);
      setEffectLikely(autopsy.effectLikely);
      setEffectNeedsData(autopsy.effectNeedsData);
      setAiReport(autopsy.aiReport ?? "");
      toast.success("پیش‌نویس AI اعمال شد — در صورت نیاز ویرایش و ذخیره کنید");
    });
  };

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">کالبدشکافی</h3>
          <p className="text-sm text-muted-foreground">
            فقط دستی؛ پیش‌نویس AI اختیاری است و خودکار ذخیره نمی‌شود مگر دکمه ذخیره
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={isPending} onClick={generateDraft}>
            تولید پیش‌نویس AI
          </Button>
          <Button type="button" disabled={isPending} onClick={save}>
            ذخیره
          </Button>
        </div>
      </div>

      {(
        [
          ["plannedSummary", "خلاصه برنامه", plannedSummary, setPlannedSummary],
          ["actualSummary", "خلاصه اجرا", actualSummary, setActualSummary],
          ["missingSummary", "موارد انجام‌نشده", missingSummary, setMissingSummary],
          ["effectiveSummary", "اقدامات مؤثر", effectiveSummary, setEffectiveSummary],
          ["ineffectiveSummary", "اقدامات کم‌اثر", ineffectiveSummary, setIneffectiveSummary],
          ["effectProven", "اثر اثبات‌شده", effectProven, setEffectProven],
          ["effectLikely", "اثر محتمل", effectLikely, setEffectLikely],
          ["effectNeedsData", "نیاز به داده بیشتر", effectNeedsData, setEffectNeedsData],
        ] as const
      ).map(([key, label, value, setter]) => (
        <div key={key} className="space-y-2">
          <Label>{label}</Label>
          <Textarea rows={3} value={value} onChange={(event) => setter(event.target.value)} />
        </div>
      ))}

      <div className="space-y-2">
        <Label>داده‌های نظرسنجی خارجی (JSON)</Label>
        <Textarea
          rows={6}
          className="font-mono text-xs"
          value={surveyJson}
          onChange={(event) => setSurveyJson(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>آدرس فایل‌های خارجی (هر خط یک URL)</Label>
        <Textarea
          rows={3}
          value={fileUrlsText}
          onChange={(event) => setFileUrlsText(event.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label>گزارش AI</Label>
        <Textarea rows={4} value={aiReport} onChange={(event) => setAiReport(event.target.value)} />
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground">شناسه دستورکار</Label>
        <Input value={directiveId} readOnly />
      </div>
    </div>
  );
}
