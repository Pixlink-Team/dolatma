"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminHref, formatPersianNumber } from "@/lib/utils";
import {
  CREATED_BY_TYPE_LABELS,
  INGESTION_LABELS,
  ITEM_STATUS_LABELS,
  PLATFORM_LABELS,
  RESPONSE_TYPE_LABELS,
  REVIEW_STATUS_LABELS,
  RISK_LABELS,
  SENTIMENT_LABELS,
  URGENCY_LABELS,
} from "@/lib/monitoring/labels";
import type {
  AiMonitoredItemAnalysis,
  CaseCreatedByType,
  MonitoredItem,
  ResponseType,
  RiskLevel,
  UrgencyLevel,
} from "@/lib/monitoring/types";
import {
  analyzeMonitoredItemAiAction,
  convertMonitoredItemToCaseAction,
  ensureMonitoringReadyAction,
  getMonitoredItemAction,
} from "@/lib/actions/monitoring-actions";
import {
  MonitoringEmptyState,
  MonitoringSection,
  RiskBadge,
  UrgencyBadge,
} from "@/components/admin/monitoring/monitoring-ui";
import { useMonitoringPaths } from "@/components/admin/monitoring/monitoring-paths";

const WIZARD_STEPS = [
  "اطلاعات پایه",
  "ارزیابی",
  "مسئولان",
  "فرمان",
  "پیش‌نمایش اعلان",
  "تأیید نهایی",
] as const;

function riskFromScore(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

function parseAiAnalysis(json: Record<string, unknown> | null): AiMonitoredItemAnalysis | null {
  if (!json || typeof json.summary !== "string") return null;
  return json as unknown as AiMonitoredItemAnalysis;
}

export function MonitoringItemDetailAdmin({
  campaignId,
  itemId,
  initialConvert = false,
}: {
  campaignId: string;
  itemId: string;
  initialConvert?: boolean;
}) {
  const router = useRouter();
  const paths = useMonitoringPaths();

  const [item, setItem] = useState<MonitoredItem | null>(null);
  const [similar, setSimilar] = useState<MonitoredItem[]>([]);
  const [analysis, setAnalysis] = useState<AiMonitoredItemAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(initialConvert);
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();

  const [wizard, setWizard] = useState({
    title: "",
    description: "",
    createdByType: "monitoring_team" as CaseCreatedByType,
    riskLevel: "high" as RiskLevel,
    urgencyLevel: "high" as UrgencyLevel,
    responseType: "official_response" as ResponseType,
    responseDeadlineHours: "6",
    assignedOrganizationId: "",
    assignedManagerId: "",
    assignedPublicRelationsManagerId: "",
    assignedShiftOfficerId: "",
    commandText: "",
    requiredActionsText: "",
    expectedOutput: "کنترل روایت منفی و انتشار پاسخ رسمی",
    publishChannelsText: "تلگرام، اینستاگرام، خبرگزاری‌ها",
    republishOrganizationsText: "",
    sendNotifications: true,
  });

  const load = () => {
    startTransition(async () => {
      setLoading(true);
      await ensureMonitoringReadyAction(campaignId);
      const result = await getMonitoredItemAction(itemId);
      if (!result.success) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      setItem(result.item);
      setSimilar(result.similar);
      const parsed = parseAiAnalysis(result.item.aiAnalysisJson);
      setAnalysis(parsed);
      setWizard((prev) => ({
        ...prev,
        title: `واکنش سریع: ${result.item.title}`,
        description: result.item.summary,
        riskLevel: riskFromScore(result.item.riskScore),
        urgencyLevel: result.item.urgencyLevel,
        responseType: result.item.suggestedResponseType ?? "official_response",
        responseDeadlineHours: String(result.item.responseDeadlineHours ?? 6),
        assignedOrganizationId: result.item.organizationId,
        commandText: `دستور فوری برای پاسخ به خبر «${result.item.title}». لطفاً ظرف مهلت تعیین‌شده روایت رسمی منتشر شود.`,
        requiredActionsText: "تهیه پاسخ رسمی\nتولید محتوای توضیحی\nانتشار در کانال‌های اصلی",
      }));
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, itemId]);

  useEffect(() => {
    if (initialConvert) setShowWizard(true);
  }, [initialConvert]);

  const notificationPreview = useMemo(() => {
    if (!item) return "";
    return `هشدار واکنش سریع\nسازمان: ${item.organizationName ?? "—"}\nموضوع: ${wizard.title}\nریسک: ${RISK_LABELS[wizard.riskLevel]}\nمهلت: ${wizard.responseDeadlineHours} ساعت\nلطفاً فوراً اقدام کنید.`;
  }, [item, wizard]);

  const runAi = () => {
    startTransition(async () => {
      const result = await analyzeMonitoredItemAiAction(itemId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setAnalysis(result.analysis);
      toast.success("تحلیل هوش مصنوعی آماده شد");
      load();
    });
  };

  const confirmConvert = () => {
    startTransition(async () => {
      const result = await convertMonitoredItemToCaseAction({
        itemId,
        createdByType: wizard.createdByType,
        title: wizard.title.trim(),
        description: wizard.description.trim(),
        riskLevel: wizard.riskLevel,
        urgencyLevel: wizard.urgencyLevel,
        responseType: wizard.responseType,
        responseDeadlineHours: Number(wizard.responseDeadlineHours) || 6,
        assignedOrganizationId: wizard.assignedOrganizationId || null,
        assignedManagerId: wizard.assignedManagerId.trim() || null,
        assignedPublicRelationsManagerId: wizard.assignedPublicRelationsManagerId.trim() || null,
        assignedShiftOfficerId: wizard.assignedShiftOfficerId.trim() || null,
        commandText: wizard.commandText.trim() || null,
        requiredActions: wizard.requiredActionsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        expectedOutput: wizard.expectedOutput.trim() || null,
        publishChannels: wizard.publishChannelsText
          .split(/[,،]/)
          .map((s) => s.trim())
          .filter(Boolean),
        republishOrganizations: wizard.republishOrganizationsText
          .split(/[,،]/)
          .map((s) => s.trim())
          .filter(Boolean),
        sendNotifications: wizard.sendNotifications,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`پرونده ${result.caseNumber} ایجاد شد`);
      router.push(adminHref(paths.caseDetail(result.caseId), campaignId));
    });
  };

  if (loading && !item) {
    return <div className="p-6 text-sm text-muted-foreground">در حال بارگذاری جزئیات خبر...</div>;
  }

  if (!item) {
    return (
      <div className="p-6">
        <MonitoringEmptyState title="خبر یافت نشد" description="این مورد در سامانه موجود نیست." />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-xl font-bold">{item.title}</h1>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{ITEM_STATUS_LABELS[item.status]}</span>
            <span>•</span>
            <span>{SENTIMENT_LABELS[item.sentiment]}</span>
            <span>•</span>
            <span>ریسک {formatPersianNumber(item.riskScore)}</span>
            <span>•</span>
            <span>{PLATFORM_LABELS[item.platform] ?? item.platform}</span>
            <span>•</span>
            <span>{INGESTION_LABELS[item.ingestionType]}</span>
            <span>•</span>
            <span>
              شناسایی:{" "}
              {new Date(item.detectedAt).toLocaleString("fa-IR", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
          <div className="flex gap-2">
            <RiskBadge level={riskFromScore(item.riskScore)} />
            <UrgencyBadge level={item.urgencyLevel} />
            <span className="inline-flex rounded-md border px-2 py-0.5 text-xs">
              {REVIEW_STATUS_LABELS[item.reviewStatus]}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={adminHref(paths.feed, campaignId)}>بازگشت به جریان</Link>
          </Button>
          {item.status !== "converted_to_case" ? (
            <Button
              onClick={() => {
                setShowWizard(true);
                setStep(0);
              }}
            >
              تبدیل به پرونده
            </Button>
          ) : null}
        </div>
      </div>

      {showWizard ? (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">جادوگر تبدیل به پرونده واکنش سریع</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowWizard(false)}>
              بستن
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {WIZARD_STEPS.map((label, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(idx)}
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  step === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {formatPersianNumber(idx + 1)}. {label}
              </button>
            ))}
          </div>

          {step === 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <Label>عنوان پرونده</Label>
                <Input
                  value={wizard.title}
                  onChange={(e) => setWizard((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>شرح</Label>
                <Textarea
                  value={wizard.description}
                  onChange={(e) => setWizard((p) => ({ ...p, description: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="space-y-1">
                <Label>ایجادکننده</Label>
                <Select
                  value={wizard.createdByType}
                  onValueChange={(v) =>
                    setWizard((p) => ({ ...p, createdByType: v as CaseCreatedByType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CREATED_BY_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>سطح ریسک</Label>
                <Select
                  value={wizard.riskLevel}
                  onValueChange={(v) => setWizard((p) => ({ ...p, riskLevel: v as RiskLevel }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RISK_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>فوریت</Label>
                <Select
                  value={wizard.urgencyLevel}
                  onValueChange={(v) => setWizard((p) => ({ ...p, urgencyLevel: v as UrgencyLevel }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(URGENCY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>نوع پاسخ</Label>
                <Select
                  value={wizard.responseType}
                  onValueChange={(v) => setWizard((p) => ({ ...p, responseType: v as ResponseType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESPONSE_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>مهلت (ساعت)</Label>
                <Input
                  type="number"
                  min={1}
                  value={wizard.responseDeadlineHours}
                  onChange={(e) =>
                    setWizard((p) => ({ ...p, responseDeadlineHours: e.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>شناسه سازمان مسئول (اختیاری)</Label>
                <Input
                  value={wizard.assignedOrganizationId}
                  onChange={(e) =>
                    setWizard((p) => ({ ...p, assignedOrganizationId: e.target.value }))
                  }
                  dir="ltr"
                  className="text-left"
                  placeholder="organization-id"
                />
              </div>
              <div className="space-y-1">
                <Label>شناسه مدیر (اختیاری)</Label>
                <Input
                  value={wizard.assignedManagerId}
                  onChange={(e) => setWizard((p) => ({ ...p, assignedManagerId: e.target.value }))}
                  dir="ltr"
                  className="text-left"
                  placeholder="manager-user-id"
                />
              </div>
              <div className="space-y-1">
                <Label>شناسه مدیر روابط عمومی (اختیاری)</Label>
                <Input
                  value={wizard.assignedPublicRelationsManagerId}
                  onChange={(e) =>
                    setWizard((p) => ({
                      ...p,
                      assignedPublicRelationsManagerId: e.target.value,
                    }))
                  }
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="space-y-1">
                <Label>شناسه مسئول شیفت (اختیاری)</Label>
                <Input
                  value={wizard.assignedShiftOfficerId}
                  onChange={(e) =>
                    setWizard((p) => ({ ...p, assignedShiftOfficerId: e.target.value }))
                  }
                  dir="ltr"
                  className="text-left"
                />
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>متن فرمان</Label>
                <Textarea
                  value={wizard.commandText}
                  onChange={(e) => setWizard((p) => ({ ...p, commandText: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="space-y-1">
                <Label>اقدامات الزامی (هر خط یک مورد)</Label>
                <Textarea
                  value={wizard.requiredActionsText}
                  onChange={(e) => setWizard((p) => ({ ...p, requiredActionsText: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="space-y-1">
                <Label>خروجی مورد انتظار</Label>
                <Input
                  value={wizard.expectedOutput}
                  onChange={(e) => setWizard((p) => ({ ...p, expectedOutput: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>کانال‌های انتشار</Label>
                <Input
                  value={wizard.publishChannelsText}
                  onChange={(e) => setWizard((p) => ({ ...p, publishChannelsText: e.target.value }))}
                  placeholder="تلگرام، اینستاگرام"
                />
              </div>
              <div className="space-y-1">
                <Label>سازمان‌های بازنشر</Label>
                <Input
                  value={wizard.republishOrganizationsText}
                  onChange={(e) =>
                    setWizard((p) => ({ ...p, republishOrganizationsText: e.target.value }))
                  }
                  placeholder="سازمان الف، سازمان ب"
                />
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={wizard.sendNotifications}
                  onChange={(e) =>
                    setWizard((p) => ({ ...p, sendNotifications: e.target.checked }))
                  }
                />
                ارسال اعلان به مسئولان
              </label>
              <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm">
                {notificationPreview}
              </pre>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">عنوان:</span> {wizard.title}
              </p>
              <p>
                <span className="text-muted-foreground">ریسک / فوریت:</span>{" "}
                {RISK_LABELS[wizard.riskLevel]} / {URGENCY_LABELS[wizard.urgencyLevel]}
              </p>
              <p>
                <span className="text-muted-foreground">نوع پاسخ:</span>{" "}
                {RESPONSE_TYPE_LABELS[wizard.responseType]}
              </p>
              <p>
                <span className="text-muted-foreground">مهلت:</span>{" "}
                {formatPersianNumber(Number(wizard.responseDeadlineHours) || 0)} ساعت
              </p>
              <p className="text-muted-foreground">پس از تأیید، پرونده واکنش سریع ایجاد می‌شود.</p>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-between gap-2">
            <Button
              variant="outline"
              disabled={step === 0 || pending}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              قبلی
            </Button>
            {step < WIZARD_STEPS.length - 1 ? (
              <Button disabled={pending} onClick={() => setStep((s) => Math.min(5, s + 1))}>
                بعدی
              </Button>
            ) : (
              <Button disabled={pending} onClick={confirmConvert}>
                تأیید و ایجاد پرونده
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <MonitoringSection title="محتوا">
        <div className="rounded-xl border p-4 space-y-3">
          <p className="text-sm text-muted-foreground">{item.summary}</p>
          <div className="whitespace-pre-wrap text-sm leading-7">{item.fullText}</div>
        </div>
      </MonitoringSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <MonitoringSection title="اطلاعات منبع">
          <div className="rounded-xl border p-4 text-sm space-y-2">
            <p>سازمان: {item.organizationName ?? "—"}</p>
            <p>منبع: {item.sourceName ?? "نامشخص"}</p>
            <p>پلتفرم: {PLATFORM_LABELS[item.platform] ?? item.platform}</p>
            <p>نویسنده: {item.authorName ?? "—"}</p>
            <p>
              لینک:{" "}
              {item.sourceUrl ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline break-all"
                  dir="ltr"
                >
                  {item.sourceUrl}
                </a>
              ) : (
                "—"
              )}
            </p>
            <p>محدوده: {item.geographicScope ?? "—"}</p>
            <p>استان: {item.provinceId ?? "—"}</p>
          </div>
        </MonitoringSection>

        <MonitoringSection title="آمار تعامل">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["بازدید", item.viewCount],
              ["لایک", item.likeCount],
              ["نظر", item.commentCount],
              ["شیر", item.shareCount],
              ["ریپست", item.repostCount],
              ["تعامل", item.engagementCount],
              ["رشد٪", item.growthRate],
              ["ریسک", item.riskScore],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold">{formatPersianNumber(Number(value))}</p>
              </div>
            ))}
          </div>
        </MonitoringSection>
      </div>

      <MonitoringSection title="کلیدواژه منطبق">
        <div className="rounded-xl border p-4 text-sm">
          {item.matchedKeyword ? item.matchedKeyword : "کلیدواژه‌ای ثبت نشده است."}
        </div>
      </MonitoringSection>

      <MonitoringSection
        title="تحلیل هوش مصنوعی"
        actions={
          <Button size="sm" variant="outline" disabled={pending} onClick={runAi}>
            اجرای تحلیل AI
          </Button>
        }
      >
        {!analysis ? (
          <MonitoringEmptyState
            title="تحلیل انجام نشده"
            description="برای دریافت پیشنهاد پاسخ و اقدامات، تحلیل را اجرا کنید."
          />
        ) : (
          <div className="rounded-xl border p-4 space-y-3 text-sm">
            <p>
              <span className="font-medium">خلاصه:</span> {analysis.summary}
            </p>
            <p>
              <span className="font-medium">اهمیت:</span> {analysis.whyImportant}
            </p>
            <p>
              <span className="font-medium">احتمال وایرال:</span>{" "}
              {formatPersianNumber(analysis.viralityProbability)}
            </p>
            <p>
              <span className="font-medium">نوع پاسخ پیشنهادی:</span>{" "}
              {RESPONSE_TYPE_LABELS[analysis.recommendedResponseType]}
            </p>
            <div>
              <p className="font-medium mb-1">پیام‌های کلیدی</p>
              <ul className="list-disc pr-5 space-y-1">
                {analysis.keyMessages.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">اقدامات فوری</p>
              <ul className="list-disc pr-5 space-y-1">
                {analysis.immediateActions.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </MonitoringSection>

      <MonitoringSection title="یادداشت کارشناسی">
        <div className="rounded-xl border p-4 text-sm whitespace-pre-wrap">
          {item.expertNotes?.trim() || "یادداشتی ثبت نشده است."}
        </div>
      </MonitoringSection>

      <MonitoringSection title="موارد مشابه">
        {similar.length === 0 ? (
          <MonitoringEmptyState title="مورد مشابهی نیست" description="خبر مشابهی در سازمان یافت نشد." />
        ) : (
          <div className="space-y-2">
            {similar.map((s) => (
              <Link
                key={s.id}
                href={adminHref(paths.item(s.id), campaignId)}
                className="block rounded-xl border p-3 hover:bg-muted/40"
              >
                <p className="font-medium">{s.title}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{s.summary}</p>
              </Link>
            ))}
          </div>
        )}
      </MonitoringSection>

      <MonitoringSection title="رشد و روند">
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          نمودار رشد این خبر به‌زودی از روی اسنپ‌شات‌های دوره‌ای تکمیل می‌شود. رشد فعلی:{" "}
          {formatPersianNumber(item.growthRate)}٪
        </div>
      </MonitoringSection>
    </div>
  );
}
