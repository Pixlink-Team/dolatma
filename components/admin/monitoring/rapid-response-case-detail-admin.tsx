"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
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
import { adminHref, cn, formatPersianNumber } from "@/lib/utils";
import {
  ACTION_STATUS_LABELS,
  ACTION_TYPE_LABELS,
  CASE_STATUS_COLORS,
  CASE_STATUS_LABELS,
  CHANNEL_LABELS,
  PLATFORM_LABELS,
  RESPONSE_TYPE_LABELS,
  RISK_LABELS,
  SENTIMENT_LABELS,
  URGENCY_LABELS,
} from "@/lib/monitoring/labels";
import type {
  ActionStatus,
  ActionType,
  AiMonitoredItemAnalysis,
  CaseAuditEvent,
  CaseContentAsset,
  CaseMetricSnapshot,
  CasePublication,
  EffectivenessScoreResult,
  MonitoredItem,
  MonitoringNotification,
  RapidResponseCase,
  ResponseAction,
} from "@/lib/monitoring/types";
import {
  addResponseActionAction,
  analyzeCaseEffectivenessAction,
  closeRapidResponseCaseAction,
  convertAiSuggestionsToActionsAction,
  createCaseContentAction,
  ensureMonitoringReadyAction,
  getRapidResponseCaseAction,
  registerCasePublicationAction,
  startRapidResponseCaseAction,
  updateResponseActionAction,
} from "@/lib/actions/monitoring-actions";
import {
  MonitoringEmptyState,
  MonitoringSection,
  MonitoringStatCard,
  RiskBadge,
  UrgencyBadge,
} from "@/components/admin/monitoring/monitoring-ui";
import { NarrativeComparisonChart } from "@/components/admin/monitoring/narrative-comparison-chart";

const ACTION_COLUMNS: ActionStatus[] = [
  "pending",
  "assigned",
  "in_progress",
  "awaiting_approval",
  "completed",
  "overdue",
];

type DialogKind = "action" | "content" | "publish" | "close" | null;

function parseAi(json: Record<string, unknown> | null): AiMonitoredItemAnalysis | null {
  if (!json || typeof json.summary !== "string") return null;
  return json as unknown as AiMonitoredItemAnalysis;
}

export function RapidResponseCaseDetailAdmin({
  campaignId,
  caseId,
}: {
  campaignId: string;
  caseId: string;
}) {
  const [caseItem, setCaseItem] = useState<RapidResponseCase | null>(null);
  const [actions, setActions] = useState<ResponseAction[]>([]);
  const [snapshots, setSnapshots] = useState<CaseMetricSnapshot[]>([]);
  const [notifications, setNotifications] = useState<MonitoringNotification[]>([]);
  const [auditEvents, setAuditEvents] = useState<CaseAuditEvent[]>([]);
  const [contents, setContents] = useState<CaseContentAsset[]>([]);
  const [publications, setPublications] = useState<CasePublication[]>([]);
  const [item, setItem] = useState<MonitoredItem | null>(null);
  const [effectiveness, setEffectiveness] = useState<EffectivenessScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [pending, startTransition] = useTransition();

  const [actionForm, setActionForm] = useState({
    title: "",
    description: "",
    actionType: "prepare_response" as ActionType,
    priority: "70",
  });
  const [contentForm, setContentForm] = useState({
    title: "",
    contentType: "text",
    bodyText: "",
  });
  const [publishForm, setPublishForm] = useState({
    channel: "telegram",
    accountName: "",
    url: "",
    viewCount: "0",
    engagementCount: "0",
    publishingOrganization: "",
  });
  const [closeResult, setCloseResult] = useState("");

  const load = () => {
    startTransition(async () => {
      setLoading(true);
      await ensureMonitoringReadyAction(campaignId);
      const result = await getRapidResponseCaseAction(caseId);
      if (!result.success) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      setCaseItem(result.caseItem);
      setActions(result.actions);
      setSnapshots(result.snapshots);
      setNotifications(result.notifications);
      setAuditEvents(result.auditEvents);
      setContents(result.contents);
      setPublications(result.publications);
      setItem(result.item);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, caseId]);

  const chartData = useMemo(
    () =>
      snapshots.map((row) => ({
        label: new Date(row.recordedAt).toLocaleTimeString("fa-IR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        negativeReach: row.negativeReach,
        responseReach: row.responseReach,
      })),
    [snapshots]
  );

  const ai = useMemo(
    () => parseAi(caseItem?.aiAnalysisJson ?? null) ?? parseAi(item?.aiAnalysisJson ?? null),
    [caseItem, item]
  );

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => {
      await fn();
    });
  };

  if (loading && !caseItem) {
    return <div className="p-6 text-sm text-muted-foreground">در حال بارگذاری پرونده...</div>;
  }

  if (!caseItem) {
    return (
      <div className="p-6">
        <MonitoringEmptyState title="پرونده یافت نشد" description="این پرونده در دسترس نیست." />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground" dir="ltr">
            {caseItem.caseNumber}
          </p>
          <h1 className="text-xl font-bold">{caseItem.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                CASE_STATUS_COLORS[caseItem.caseStatus]
              )}
            >
              {CASE_STATUS_LABELS[caseItem.caseStatus]}
            </span>
            <RiskBadge level={caseItem.riskLevel} />
            <UrgencyBadge level={caseItem.urgencyLevel} />
            <span className="text-xs text-muted-foreground">
              {RESPONSE_TYPE_LABELS[caseItem.responseType]}
            </span>
            {caseItem.deadline ? (
              <span className="text-xs text-muted-foreground">
                مهلت:{" "}
                {new Date(caseItem.deadline).toLocaleString("fa-IR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={adminHref("/admin/rapid-response/cases", campaignId)}>لیست پرونده‌ها</Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const result = await startRapidResponseCaseAction(caseId);
                if (!result.success) toast.error(result.error);
                else {
                  toast.success("واکنش آغاز شد");
                  load();
                }
              })
            }
          >
            شروع
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDialog("action")}>
            افزودن اقدام
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDialog("content")}>
            ایجاد محتوا
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDialog("publish")}>
            ثبت انتشار
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const result = await analyzeCaseEffectivenessAction(caseId);
                if (!result.success) toast.error(result.error);
                else {
                  setEffectiveness(result.result);
                  toast.success("اثربخشی محاسبه شد");
                  load();
                }
              })
            }
          >
            تحلیل اثربخشی
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDialog("close")}>
            بستن پرونده
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MonitoringStatCard label="دسترسی خبر منفی" value={caseItem.negativeReach} tone="danger" />
        <MonitoringStatCard label="دسترسی پاسخ" value={caseItem.responseReach} tone="success" />
        <MonitoringStatCard
          label="نسبت پوشش"
          value={`${formatPersianNumber(Math.round(caseItem.coverageRatio * 100))}٪`}
        />
        <MonitoringStatCard
          label="امتیاز اثربخشی"
          value={
            caseItem.effectivenessScore != null
              ? formatPersianNumber(caseItem.effectivenessScore)
              : "—"
          }
          tone="success"
        />
      </div>

      <MonitoringSection title="مقایسه روایت منفی و رسمی">
        <NarrativeComparisonChart data={chartData} />
      </MonitoringSection>

      {item ? (
        <MonitoringSection title="خبر منفی مرتبط">
          <div className="rounded-xl border p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{item.title}</p>
              <Button asChild size="sm" variant="ghost">
                <Link href={adminHref(`/admin/monitoring/items/${item.id}`, campaignId)}>
                  مشاهده خبر
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{item.summary}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{item.organizationName}</span>
              <span>{item.sourceName ?? "منبع نامشخص"}</span>
              <span>{PLATFORM_LABELS[item.platform] ?? item.platform}</span>
              <span>{SENTIMENT_LABELS[item.sentiment]}</span>
            </div>
          </div>
        </MonitoringSection>
      ) : null}

      <MonitoringSection
        title="تحلیل و پیشنهاد هوش مصنوعی"
        actions={
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const result = await convertAiSuggestionsToActionsAction(caseId);
                if (!result.success) toast.error(result.error);
                else {
                  toast.success(`${result.actions.length} اقدام از AI ایجاد شد`);
                  load();
                }
              })
            }
          >
            تبدیل پیشنهادها به اقدام
          </Button>
        }
      >
        {!ai && !caseItem.aiSummary ? (
          <MonitoringEmptyState
            title="تحلیل موجود نیست"
            description="پس از تبدیل خبر، پیشنهادهای AI اینجا نمایش داده می‌شوند."
          />
        ) : (
          <div className="rounded-xl border p-4 space-y-3 text-sm">
            <p>{caseItem.aiSummary ?? ai?.summary}</p>
            {caseItem.aiRecommendation ? (
              <p>
                <span className="font-medium">توصیه:</span> {caseItem.aiRecommendation}
              </p>
            ) : null}
            {ai?.recommendedActions?.length ? (
              <ul className="list-disc pr-5 space-y-1">
                {ai.recommendedActions.map((a) => (
                  <li key={a.title}>
                    {a.title} — {ACTION_TYPE_LABELS[a.actionType]}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </MonitoringSection>

      <MonitoringSection title="متن فرمان">
        <div className="rounded-xl border p-4 text-sm whitespace-pre-wrap">
          {caseItem.commandText?.trim() || "فرمانی ثبت نشده است."}
        </div>
        {caseItem.requiredActions.length > 0 ? (
          <ul className="mt-3 list-disc pr-5 text-sm space-y-1">
            {caseItem.requiredActions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        ) : null}
      </MonitoringSection>

      <MonitoringSection title="اقدامات">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {ACTION_COLUMNS.map((status) => {
            const columnActions = actions.filter((a) => a.status === status);
            return (
              <div key={status} className="rounded-xl border bg-muted/20 p-3 min-h-[140px]">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {ACTION_STATUS_LABELS[status]} ({formatPersianNumber(columnActions.length)})
                </p>
                <div className="space-y-2">
                  {columnActions.map((action) => (
                    <div key={action.id} className="rounded-lg border bg-card p-2 text-xs space-y-2">
                      <p className="font-medium">{action.title}</p>
                      <p className="text-muted-foreground">
                        {ACTION_TYPE_LABELS[action.actionType]}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {status !== "in_progress" && status !== "completed" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            disabled={pending}
                            onClick={() =>
                              run(async () => {
                                const result = await updateResponseActionAction(action.id, {
                                  status: "in_progress",
                                });
                                if (!result.success) toast.error(result.error);
                                else load();
                              })
                            }
                          >
                            شروع
                          </Button>
                        ) : null}
                        {status !== "completed" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            disabled={pending}
                            onClick={() =>
                              run(async () => {
                                const result = await updateResponseActionAction(action.id, {
                                  status: "completed",
                                  resultDescription: "انجام شد",
                                });
                                if (!result.success) toast.error(result.error);
                                else {
                                  toast.success("اقدام تکمیل شد");
                                  load();
                                }
                              })
                            }
                          >
                            تکمیل
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </MonitoringSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <MonitoringSection title="محتواها">
          {contents.length === 0 ? (
            <MonitoringEmptyState title="محتوایی نیست" description="هنوز محتوایی ثبت نشده است." />
          ) : (
            <div className="space-y-2">
              {contents.map((c) => (
                <div key={c.id} className="rounded-xl border p-3 text-sm">
                  <p className="font-medium">{c.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.contentType} • {c.productionStatus} • {c.approvalStatus}
                  </p>
                  <p className="mt-2 line-clamp-3 text-muted-foreground">{c.bodyText}</p>
                </div>
              ))}
            </div>
          )}
        </MonitoringSection>

        <MonitoringSection title="انتشارات">
          {publications.length === 0 ? (
            <MonitoringEmptyState title="انتشاری نیست" description="هنوز انتشاری ثبت نشده است." />
          ) : (
            <div className="space-y-2">
              {publications.map((p) => (
                <div key={p.id} className="rounded-xl border p-3 text-sm">
                  <p className="font-medium">
                    {p.channel} — {p.accountName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    بازدید {formatPersianNumber(p.viewCount)} • تعامل{" "}
                    {formatPersianNumber(p.engagementCount)}
                  </p>
                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-primary underline break-all"
                      dir="ltr"
                    >
                      {p.url}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </MonitoringSection>
      </div>

      <MonitoringSection title="سنجش اثر">
        <div className="rounded-xl border p-4 text-sm space-y-2">
          <p>
            احساسات قبل:{" "}
            {caseItem.sentimentBefore ? SENTIMENT_LABELS[caseItem.sentimentBefore] : "—"}
          </p>
          <p>
            احساسات بعد:{" "}
            {caseItem.sentimentAfter ? SENTIMENT_LABELS[caseItem.sentimentAfter] : "—"}
          </p>
          <p>
            ریسک پرونده: {RISK_LABELS[caseItem.riskLevel]} / فوریت:{" "}
            {URGENCY_LABELS[caseItem.urgencyLevel]}
          </p>
          {effectiveness ? (
            <div className="mt-3 space-y-2 border-t pt-3">
              <p>
                سطح: {effectiveness.effectivenessLevel} — امتیاز{" "}
                {formatPersianNumber(effectiveness.effectivenessScore)}
              </p>
              <p>{effectiveness.aiFinalAssessment}</p>
              {effectiveness.successFactors.length > 0 ? (
                <p>نقاط قوت: {effectiveness.successFactors.join("، ")}</p>
              ) : null}
              {effectiveness.weaknesses.length > 0 ? (
                <p>ضعف‌ها: {effectiveness.weaknesses.join("، ")}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground">برای محاسبه، دکمه «تحلیل اثربخشی» را بزنید.</p>
          )}
        </div>
      </MonitoringSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <MonitoringSection title="لاگ ممیزی">
          {auditEvents.length === 0 ? (
            <MonitoringEmptyState title="رویدادی نیست" description="رویداد ممیزی ثبت نشده است." />
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {auditEvents.map((e) => (
                <div key={e.id} className="rounded-xl border p-3 text-sm">
                  <p className="font-medium">{e.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {e.actorName ?? "سیستم"} • {e.eventType} •{" "}
                    {new Date(e.createdAt).toLocaleString("fa-IR")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </MonitoringSection>

        <MonitoringSection title="اعلان‌ها">
          {notifications.length === 0 ? (
            <MonitoringEmptyState title="اعلانی نیست" description="اعلانی برای این پرونده ارسال نشده." />
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className="rounded-xl border p-3 text-sm">
                  <p className="font-medium">{n.title}</p>
                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n.recipientName ?? "—"} • {CHANNEL_LABELS[n.channel]} • {n.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </MonitoringSection>
      </div>

      {dialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card p-4 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {dialog === "action"
                  ? "افزودن اقدام"
                  : dialog === "content"
                    ? "ایجاد محتوا"
                    : dialog === "publish"
                      ? "ثبت انتشار"
                      : "بستن پرونده"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setDialog(null)}>
                بستن
              </Button>
            </div>

            {dialog === "action" ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>عنوان</Label>
                  <Input
                    value={actionForm.title}
                    onChange={(e) => setActionForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="مثلاً: تهیه بیانیه رسمی"
                  />
                </div>
                <div className="space-y-1">
                  <Label>توضیح</Label>
                  <Textarea
                    value={actionForm.description}
                    onChange={(e) => setActionForm((p) => ({ ...p, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-1">
                  <Label>نوع اقدام</Label>
                  <Select
                    value={actionForm.actionType}
                    onValueChange={(v) =>
                      setActionForm((p) => ({ ...p, actionType: v as ActionType }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACTION_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  disabled={pending || !actionForm.title.trim()}
                  onClick={() =>
                    run(async () => {
                      const result = await addResponseActionAction({
                        caseId,
                        title: actionForm.title.trim(),
                        description: actionForm.description.trim(),
                        actionType: actionForm.actionType,
                        priority: Number(actionForm.priority) || 50,
                      });
                      if (!result.success) toast.error(result.error);
                      else {
                        toast.success("اقدام افزوده شد");
                        setDialog(null);
                        setActionForm({
                          title: "",
                          description: "",
                          actionType: "prepare_response",
                          priority: "70",
                        });
                        load();
                      }
                    })
                  }
                >
                  ذخیره اقدام
                </Button>
              </div>
            ) : null}

            {dialog === "content" ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>عنوان</Label>
                  <Input
                    value={contentForm.title}
                    onChange={(e) => setContentForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="عنوان بسته محتوایی"
                  />
                </div>
                <div className="space-y-1">
                  <Label>نوع</Label>
                  <Input
                    value={contentForm.contentType}
                    onChange={(e) => setContentForm((p) => ({ ...p, contentType: e.target.value }))}
                    placeholder="text / image / video"
                  />
                </div>
                <div className="space-y-1">
                  <Label>متن</Label>
                  <Textarea
                    value={contentForm.bodyText}
                    onChange={(e) => setContentForm((p) => ({ ...p, bodyText: e.target.value }))}
                    rows={5}
                    placeholder="متن پاسخ رسمی یا کپشن انتشار..."
                  />
                </div>
                <Button
                  disabled={pending || !contentForm.title.trim() || !contentForm.bodyText.trim()}
                  onClick={() =>
                    run(async () => {
                      const result = await createCaseContentAction({
                        caseId,
                        title: contentForm.title.trim(),
                        contentType: contentForm.contentType.trim() || "text",
                        bodyText: contentForm.bodyText.trim(),
                      });
                      if (!result.success) toast.error(result.error);
                      else {
                        toast.success("محتوا ثبت شد");
                        setDialog(null);
                        setContentForm({ title: "", contentType: "text", bodyText: "" });
                        load();
                      }
                    })
                  }
                >
                  ذخیره محتوا
                </Button>
              </div>
            ) : null}

            {dialog === "publish" ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>کانال</Label>
                  <Input
                    value={publishForm.channel}
                    onChange={(e) => setPublishForm((p) => ({ ...p, channel: e.target.value }))}
                    placeholder="telegram"
                  />
                </div>
                <div className="space-y-1">
                  <Label>نام حساب</Label>
                  <Input
                    value={publishForm.accountName}
                    onChange={(e) => setPublishForm((p) => ({ ...p, accountName: e.target.value }))}
                    placeholder="مثلاً: کانال رسمی سازمان"
                  />
                </div>
                <div className="space-y-1">
                  <Label>لینک</Label>
                  <Input
                    value={publishForm.url}
                    onChange={(e) => setPublishForm((p) => ({ ...p, url: e.target.value }))}
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>بازدید</Label>
                    <Input
                      type="number"
                      value={publishForm.viewCount}
                      onChange={(e) => setPublishForm((p) => ({ ...p, viewCount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>تعامل</Label>
                    <Input
                      type="number"
                      value={publishForm.engagementCount}
                      onChange={(e) =>
                        setPublishForm((p) => ({ ...p, engagementCount: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>سازمان منتشرکننده</Label>
                  <Input
                    value={publishForm.publishingOrganization}
                    onChange={(e) =>
                      setPublishForm((p) => ({ ...p, publishingOrganization: e.target.value }))
                    }
                  />
                </div>
                <Button
                  disabled={pending || !publishForm.accountName.trim()}
                  onClick={() =>
                    run(async () => {
                      const result = await registerCasePublicationAction({
                        caseId,
                        channel: publishForm.channel.trim(),
                        accountName: publishForm.accountName.trim(),
                        url: publishForm.url.trim() || null,
                        viewCount: Number(publishForm.viewCount) || 0,
                        engagementCount: Number(publishForm.engagementCount) || 0,
                        publishingOrganization: publishForm.publishingOrganization.trim() || null,
                      });
                      if (!result.success) toast.error(result.error);
                      else {
                        toast.success("انتشار ثبت شد");
                        setDialog(null);
                        load();
                      }
                    })
                  }
                >
                  ثبت انتشار
                </Button>
              </div>
            ) : null}

            {dialog === "close" ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>نتیجه نهایی</Label>
                  <Textarea
                    value={closeResult}
                    onChange={(e) => setCloseResult(e.target.value)}
                    rows={4}
                    placeholder="مثلاً: روایت منفی کنترل شد و پاسخ رسمی منتشر گردید."
                  />
                </div>
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      const result = await closeRapidResponseCaseAction(
                        caseId,
                        closeResult.trim() || undefined
                      );
                      if (!result.success) toast.error(result.error);
                      else {
                        toast.success("پرونده بسته و آرشیو شد");
                        setDialog(null);
                        load();
                      }
                    })
                  }
                >
                  تأیید بستن
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
