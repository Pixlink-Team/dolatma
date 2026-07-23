"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentUpload } from "@/components/ui/document-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersianDateInput } from "@/components/ui/persian-date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveDirectiveAction } from "@/lib/actions/directive-actions";
import {
  generateDirectiveUnderstandingAction,
  getAiAvailabilityAction,
  getCampaignAdvisorTipsAction,
} from "@/lib/actions/directive-smart-actions";
import {
  getDirectiveWorkspaceAction,
  saveDirectiveWorkspaceMetaAction,
} from "@/lib/actions/directive-workspace-actions";
import { CONTENT_TITLE_MAX_LENGTH } from "@/lib/content-constraints";
import {
  DIRECTIVE_AUTHORITY_OPTIONS,
  type DirectiveAuthorityLevel,
} from "@/lib/directive-authority";
import {
  DIRECTIVE_MISSION_TYPE_LABELS,
  DIRECTIVE_MISSION_TYPES,
  SMART_WIZARD_STEP_LABELS,
  SMART_WIZARD_STEPS,
  emptyActionPackage,
  emptyAudienceSegment,
  emptyKpi,
  emptySmartPayload,
  normalizeSmartPayload,
  type DirectiveMissionType,
  type SmartAiUnderstanding,
  type SmartDirectivePayload,
  type SmartWizardStep,
} from "@/lib/directive-smart";
import type { DirectiveAudienceType, DirectivePriority } from "@/lib/types";
import { USER_REGIONS, getUserRegionLabel, type UserRegion } from "@/lib/user-regions";
import { adminHref, cn } from "@/lib/utils";

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(values: string[]): string {
  return values.join("\n");
}

function mergePayloadForMissionType(
  prev: SmartDirectivePayload,
  missionType: DirectiveMissionType
): SmartDirectivePayload {
  const next = emptySmartPayload(missionType);
  next.common = prev.common;
  next.aiUnderstanding = prev.aiUnderstanding;
  next.knowledgeNotes = prev.knowledgeNotes;
  if (missionType === "communication_campaign") {
    next.campaign = prev.campaign ?? next.campaign;
  } else if (missionType === "crisis_response") {
    next.crisis = prev.crisis ?? next.crisis;
  } else if (missionType === "national_occasion") {
    next.occasion = prev.occasion ?? next.occasion;
  } else if (missionType === "rumor_media_response") {
    next.rumor = prev.rumor ?? next.rumor;
  }
  return next;
}

function applyUnderstandingToCommon(
  payload: SmartDirectivePayload,
  understanding: SmartAiUnderstanding
): SmartDirectivePayload {
  return {
    ...payload,
    common: {
      ...payload.common,
      mainGoal: understanding.mainGoal || payload.common.mainGoal,
      primaryAudience: understanding.primaryAudience || payload.common.primaryAudience,
      expectedOutcome: understanding.desiredChange || payload.common.expectedOutcome,
      mandatoryActions:
        understanding.mandatoryActions.length > 0
          ? understanding.mandatoryActions
          : payload.common.mandatoryActions,
      suggestedActions:
        understanding.suggestedActions.length > 0
          ? understanding.suggestedActions
          : payload.common.suggestedActions,
      orgRoles:
        understanding.responsibleOrgs.length > 0
          ? understanding.responsibleOrgs.join("\n")
          : payload.common.orgRoles,
    },
    aiUnderstanding: understanding,
  };
}

interface DirectiveSmartWizardProps {
  campaignId: string;
  editingId: string | null;
  initialMissionType?: DirectiveMissionType | null;
  initialPayload?: SmartDirectivePayload | null;
  initialTitle?: string;
  initialBody?: string;
  initialPriority?: DirectivePriority;
  initialStartDate?: string;
  initialEndDate?: string;
  initialTopic?: string;
  initialLetter?: {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
  issuerAuthorityLevel?: DirectiveAuthorityLevel;
  issuerAuthorityOther?: string | null;
  onCancel: () => void;
  onSaved: (directiveId: string) => void;
}

export function DirectiveSmartWizard({
  campaignId,
  editingId,
  initialMissionType = null,
  initialPayload = null,
  initialTitle = "",
  initialBody = "",
  initialPriority = "normal",
  initialStartDate = "",
  initialEndDate = "",
  initialTopic = "",
  initialLetter,
  issuerAuthorityLevel = "internal",
  issuerAuthorityOther = null,
  onCancel,
  onSaved,
}: DirectiveSmartWizardProps) {
  const [step, setStep] = useState<SmartWizardStep>("type");
  const [missionType, setMissionType] = useState<DirectiveMissionType | null>(
    initialMissionType
  );
  const [payload, setPayload] = useState<SmartDirectivePayload>(
    () =>
      normalizeSmartPayload(initialPayload) ??
      emptySmartPayload(initialMissionType)
  );
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [priority, setPriority] = useState<DirectivePriority>(initialPriority);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [topic, setTopic] = useState(initialTopic);
  const [authorityLevel, setAuthorityLevel] =
    useState<DirectiveAuthorityLevel>(issuerAuthorityLevel);
  const [authorityOther, setAuthorityOther] = useState(issuerAuthorityOther ?? "");
  const [audienceType, setAudienceType] = useState<DirectiveAudienceType>("all");
  const [audienceRegion, setAudienceRegion] = useState<UserRegion | null>(null);
  const [letterUpload, setLetterUpload] = useState({
    url: initialLetter?.url ?? "",
    fileName: initialLetter?.fileName ?? "",
    fileSize: initialLetter?.fileSize ?? 0,
    mimeType: initialLetter?.mimeType ?? "",
  });
  const [publish, setPublish] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [aiConfirmed, setAiConfirmed] = useState(
    Boolean(initialPayload?.aiUnderstanding?.confirmedAt)
  );
  const [understanding, setUnderstanding] = useState<SmartAiUnderstanding | null>(
    initialPayload?.aiUnderstanding ?? null
  );
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [aiChecked, setAiChecked] = useState(false);
  const [tips, setTips] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const aiRequired = aiConfigured && aiAvailable;
  const visibleSteps = useMemo(
    () =>
      aiRequired
        ? [...SMART_WIZARD_STEPS]
        : SMART_WIZARD_STEPS.filter((item) => item !== "ai_understanding"),
    [aiRequired]
  );
  const stepIndex = visibleSteps.indexOf(step);

  useEffect(() => {
    startTransition(async () => {
      const availability = await getAiAvailabilityAction();
      const configured = availability.configured && availability.enabled;
      setAiAvailable(availability.available);
      setAiConfigured(configured);
      setAiChecked(true);
      if (!configured || !availability.available) {
        setStep((current) => (current === "ai_understanding" ? "publish" : current));
      }
    });
  }, []);

  const loadTips = (type: DirectiveMissionType | null) => {
    if (!type || !aiAvailable) return;
    startTransition(async () => {
      const result = await getCampaignAdvisorTipsAction({
        missionType: type,
        topic,
        smartPayload: payload,
      });
      if (result.success) {
        setTips(result.tips);
      }
    });
  };

  useEffect(() => {
    if (step === "type" || (step === "problem_goal" && missionType === "communication_campaign")) {
      loadTips(missionType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, missionType]);

  const updateCommon = <K extends keyof SmartDirectivePayload["common"]>(
    key: K,
    value: SmartDirectivePayload["common"][K]
  ) => {
    setPayload((prev) => ({
      ...prev,
      common: { ...prev.common, [key]: value },
    }));
  };

  const goNext = () => {
    if (step === "type" && !missionType) {
      toast.error("نوع مأموریت را انتخاب کنید");
      return;
    }
    if (step === "basics") {
      if (!title.trim()) {
        toast.error("عنوان الزامی است");
        return;
      }
      if (!body.trim()) {
        toast.error("متن دستورکار الزامی است");
        return;
      }
      if (!startDate || !endDate) {
        toast.error("تاریخ شروع و پایان الزامی است");
        return;
      }
      if (!letterUpload.url) {
        toast.error("آپلود نامه رسمی الزامی است");
        return;
      }
    }
    if (step === "ai_understanding" && aiRequired) {
      if (!understanding) {
        toast.error("ابتدا برداشت AI را تولید یا تکمیل کنید");
        return;
      }
      if (!aiConfirmed) {
        toast.error("تأیید برداشت AI برای ادامه الزامی است");
        return;
      }
    }
    const next = visibleSteps[stepIndex + 1];
    if (next) setStep(next);
  };

  const goPrev = () => {
    const prev = visibleSteps[stepIndex - 1];
    if (prev) setStep(prev);
  };

  const generateUnderstanding = () => {
    startTransition(async () => {
      const result = await generateDirectiveUnderstandingAction({
        title,
        body,
        missionType,
        smartPayload: payload,
      });
      if (!result.success) {
        toast.error(result.error ?? "تولید برداشت ناموفق بود");
        return;
      }
      setUnderstanding(result.understanding);
      setPayload((prev) => ({ ...prev, aiUnderstanding: result.understanding }));
      toast.success("برداشت AI تولید شد");
    });
  };

  const applyUnderstanding = () => {
    if (!understanding) {
      toast.error("ابتدا برداشت را تولید یا وارد کنید");
      return;
    }
    setPayload((prev) => applyUnderstandingToCommon(prev, understanding));
    toast.success("اصلاحات روی فرم اعمال شد");
  };

  const save = (asPublish: boolean) => {
    if (!missionType) {
      toast.error("نوع مأموریت را انتخاب کنید");
      return;
    }
    if (!title.trim() || !body.trim()) {
      toast.error("عنوان و متن الزامی است");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("تاریخ شروع و پایان الزامی است");
      return;
    }
    if (!letterUpload.url) {
      toast.error("آپلود نامه رسمی الزامی است");
      return;
    }
    if (authorityLevel === "other" && !authorityOther.trim()) {
      toast.error("برای منبع «سایر» توضیح الزامی است");
      return;
    }
    if (asPublish && aiRequired && (!understanding || !aiConfirmed)) {
      toast.error("برای انتشار، تأیید برداشت AI الزامی است");
      setStep("ai_understanding");
      return;
    }

    const confirmedAt =
      aiConfirmed && understanding
        ? understanding.confirmedAt || new Date().toISOString()
        : null;

    const smartPayload: SmartDirectivePayload = {
      ...payload,
      aiUnderstanding: understanding
        ? {
            ...understanding,
            confirmedAt: confirmedAt,
          }
        : payload.aiUnderstanding,
    };

    startTransition(async () => {
      const result = await saveDirectiveAction({
        id: editingId ?? undefined,
        campaignId,
        title: title.trim().slice(0, CONTENT_TITLE_MAX_LENGTH),
        body: body.trim(),
        priority,
        authorityLevel,
        authorityOther:
          authorityLevel === "other" ? authorityOther.trim() || null : null,
        startDate,
        endDate,
        letterFileUrl: letterUpload.url,
        letterFileName: letterUpload.fileName || "نامه رسمی",
        letterMimeType: letterUpload.mimeType || "application/octet-stream",
        letterFileSize: letterUpload.fileSize || 0,
        audienceType,
        audienceRegion: audienceType === "region" ? audienceRegion : null,
        sendSmsOnPublish: asPublish ? sendSms : false,
        topic: topic.trim(),
        creationMode: "smart",
        missionType,
        smartPayload,
        aiUnderstandingConfirmedAt: confirmedAt,
      });

      if (!result.success) {
        toast.error(result.error ?? "ذخیره نشد");
        return;
      }

      const directiveId = result.id;
      const existingWorkspace = await getDirectiveWorkspaceAction(directiveId);
      const existingMeta = existingWorkspace.bundle?.meta;
      const workspaceResult = await saveDirectiveWorkspaceMetaAction({
        directiveId,
        objective: smartPayload.common.mainGoal,
        expectedResults: smartPayload.common.expectedOutcome,
        urgency: priority === "urgent" ? "high" : "normal",
        mandatoryActions: smartPayload.common.mandatoryActions,
        suggestedActions: smartPayload.common.suggestedActions,
        kpis: existingMeta?.kpis ?? [],
        brandGuide: existingMeta?.brandGuide ?? "",
        executionGuide: existingMeta?.executionGuide ?? "",
        approvalRequirements: existingMeta?.approvalRequirements ?? "",
        centralOwnerUserId: existingMeta?.centralOwnerUserId ?? null,
        centralOwnerLabel: existingMeta?.centralOwnerLabel ?? null,
        faq: existingMeta?.faq ?? [],
        targetMinistryIds: existingMeta?.targetMinistryIds ?? [],
        targetOrganizationIds: existingMeta?.targetOrganizationIds ?? [],
        targetProvinces: existingMeta?.targetProvinces ?? [],
        targetCities: existingMeta?.targetCities ?? [],
      });

      if (!workspaceResult.success) {
        toast.error(
          workspaceResult.error ??
            "دستورکار ذخیره شد ولی همگام‌سازی اتاق عملیات کامل نشد"
        );
      } else {
        toast.success(
          asPublish || publish
            ? "دستورکار هوشمند منتشر شد"
            : "پیش‌نویس دستورکار هوشمند ذخیره شد"
        );
      }

      onSaved(directiveId);
      window.location.href = adminHref(`/admin/directives/${directiveId}`, campaignId);
    });
  };

  const tipsBox = tips.length > 0 ? (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
      <p className="text-sm font-medium">نکات مشاور کمپین</p>
      <ul className="list-disc pr-5 text-sm text-muted-foreground space-y-1">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  ) : null;

  const mandatoryText = listToLines(payload.common.mandatoryActions);
  const suggestedText = listToLines(payload.common.suggestedActions);

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <div className="flex flex-wrap gap-2">
        {visibleSteps.map((item, index) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              if (!aiChecked && item === "ai_understanding") return;
              setStep(item);
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              step === item
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-muted/40 text-muted-foreground hover:bg-muted"
            )}
          >
            {index + 1}. {SMART_WIZARD_STEP_LABELS[item]}
          </button>
        ))}
      </div>

      {step === "type" ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            نوع مأموریت ارتباطی را انتخاب کنید. فیلدهای تخصصی بر اساس همین انتخاب ظاهر می‌شوند.
          </p>
          {tipsBox}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DIRECTIVE_MISSION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setMissionType(type);
                  setPayload((prev) => mergePayloadForMissionType(prev, type));
                }}
                className={cn(
                  "rounded-xl border p-3 text-right transition-colors",
                  missionType === type
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/40"
                )}
              >
                <p className="text-sm font-medium">{DIRECTIVE_MISSION_TYPE_LABELS[type]}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === "basics" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>عنوان</Label>
            <Input
              value={title}
              maxLength={CONTENT_TITLE_MAX_LENGTH}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>متن دستورکار</Label>
            <Textarea rows={6} value={body} onChange={(event) => setBody(event.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>اولویت</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as DirectivePriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">عادی</SelectItem>
                  <SelectItem value="urgent">فوری</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>منبع بالادستی</Label>
              <Select
                value={authorityLevel}
                onValueChange={(value) =>
                  setAuthorityLevel(value as DirectiveAuthorityLevel)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTIVE_AUTHORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {authorityLevel === "other" ? (
            <div className="space-y-2">
              <Label>توضیح منبع (سایر)</Label>
              <Input
                value={authorityOther}
                onChange={(event) => setAuthorityOther(event.target.value)}
              />
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>تاریخ شروع</Label>
              <PersianDateInput value={startDate} onChange={setStartDate} allowEmpty />
            </div>
            <div className="space-y-2">
              <Label>تاریخ پایان</Label>
              <PersianDateInput value={endDate} onChange={setEndDate} allowEmpty />
            </div>
          </div>
          <div className="space-y-2">
            <Label>موضوع (تقویم ملی)</Label>
            <Input value={topic} onChange={(event) => setTopic(event.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>مخاطب</Label>
              <Select
                value={audienceType}
                onValueChange={(value) => setAudienceType(value as DirectiveAudienceType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه کاربران کمپین</SelectItem>
                  <SelectItem value="region">منطقه</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {audienceType === "region" ? (
              <div className="space-y-2">
                <Label>منطقه</Label>
                <Select
                  value={audienceRegion ?? ""}
                  onValueChange={(value) => setAudienceRegion(value as UserRegion)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب منطقه" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>
                        {getUserRegionLabel(region)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          <DocumentUpload
            variant="letter"
            label="نامه رسمی این اقدام"
            value={letterUpload.url}
            fileName={letterUpload.fileName}
            fileSize={letterUpload.fileSize}
            mimeType={letterUpload.mimeType}
            onChange={(next) => setLetterUpload(next)}
          />
        </div>
      ) : null}

      {step === "problem_goal" ? (
        <div className="space-y-4">
          {tipsBox}
          <div className="space-y-2">
            <Label>بیان مسئله</Label>
            <Textarea
              rows={3}
              value={payload.common.problemStatement}
              onChange={(event) => updateCommon("problemStatement", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>هدف اصلی</Label>
            <Textarea
              rows={2}
              value={payload.common.mainGoal}
              onChange={(event) => updateCommon("mainGoal", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>نتیجه مورد انتظار</Label>
            <Textarea
              rows={2}
              value={payload.common.expectedOutcome}
              onChange={(event) => updateCommon("expectedOutcome", event.target.value)}
            />
          </div>

          {missionType === "communication_campaign" && payload.campaign ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["campaignName", "نام کمپین"],
                  ["mainTopic", "موضوع اصلی"],
                  ["problemNow", "مسئله فعلی"],
                  ["whyNeeded", "چرایی نیاز"],
                  ["communicativeGoal", "هدف ارتباطی"],
                  ["behavioralGoal", "هدف رفتاری"],
                  ["mediaGoal", "هدف رسانه‌ای"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Textarea
                    rows={2}
                    value={payload.campaign?.[key] ?? ""}
                    onChange={(event) =>
                      setPayload((prev) => ({
                        ...prev,
                        campaign: prev.campaign
                          ? { ...prev.campaign, [key]: event.target.value }
                          : prev.campaign,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}

          {missionType === "crisis_response" && payload.crisis ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["crisisLevel", "سطح بحران"],
                  ["officialNarrative", "روایت رسمی"],
                  ["authorizedSpokesperson", "سخنگوی مجاز"],
                  ["lastConfirmedStatus", "آخرین وضعیت تأییدشده"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Textarea
                    rows={2}
                    value={payload.crisis?.[key] ?? ""}
                    onChange={(event) =>
                      setPayload((prev) => ({
                        ...prev,
                        crisis: prev.crisis
                          ? { ...prev.crisis, [key]: event.target.value }
                          : prev.crisis,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}

          {missionType === "national_occasion" && payload.occasion ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["occasionName", "نام مناسبت"],
                  ["occasionDate", "تاریخ مناسبت"],
                  ["mainMessage", "پیام اصلی مناسبت"],
                  ["referenceContentPack", "بسته محتوای مرجع"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Textarea
                    rows={2}
                    value={payload.occasion?.[key] ?? ""}
                    onChange={(event) =>
                      setPayload((prev) => ({
                        ...prev,
                        occasion: prev.occasion
                          ? { ...prev.occasion, [key]: event.target.value }
                          : prev.occasion,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}

          {missionType === "rumor_media_response" && payload.rumor ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["claimTopic", "موضوع ادعا"],
                  ["claimSource", "منبع ادعا"],
                  ["importanceLevel", "سطح اهمیت"],
                  ["correctNarrative", "روایت صحیح"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Textarea
                    rows={2}
                    value={payload.rumor?.[key] ?? ""}
                    onChange={(event) =>
                      setPayload((prev) => ({
                        ...prev,
                        rumor: prev.rumor
                          ? { ...prev.rumor, [key]: event.target.value }
                          : prev.rumor,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {step === "strategy" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>مخاطب اصلی</Label>
            <Textarea
              rows={2}
              value={payload.common.primaryAudience}
              onChange={(event) => updateCommon("primaryAudience", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>پیام اصلی</Label>
            <Textarea
              rows={2}
              value={payload.common.mainMessage}
              onChange={(event) => updateCommon("mainMessage", event.target.value)}
            />
          </div>

          {missionType === "communication_campaign" && payload.campaign ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["slogan", "شعار"],
                  ["callToAction", "فراخوان اقدام"],
                  ["supportingMessages", "پیام‌های پشتیبان"],
                  ["messageHierarchy", "سلسله‌مراتب پیام"],
                  ["tone", "لحن"],
                  ["doNotSay", "نگویید"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Textarea
                    rows={2}
                    value={payload.campaign?.[key] ?? ""}
                    onChange={(event) =>
                      setPayload((prev) => ({
                        ...prev,
                        campaign: prev.campaign
                          ? { ...prev.campaign, [key]: event.target.value }
                          : prev.campaign,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>بخش‌های مخاطب</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  updateCommon("audienceSegments", [
                    ...payload.common.audienceSegments,
                    emptyAudienceSegment(),
                  ])
                }
              >
                <Plus className="h-4 w-4" />
                افزودن
              </Button>
            </div>
            {payload.common.audienceSegments.map((segment, index) => (
              <Card key={segment.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">بخش {index + 1}</CardTitle>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      updateCommon(
                        "audienceSegments",
                        payload.common.audienceSegments.filter((item) => item.id !== segment.id)
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["name", "نام"],
                      ["demographics", "جمعیت‌شناختی"],
                      ["geography", "جغرافیا"],
                      ["suitableChannels", "کانال‌های مناسب"],
                      ["suitableMessage", "پیام مناسب"],
                      ["expectedAction", "اقدام مورد انتظار"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        value={segment[key]}
                        onChange={(event) => {
                          const next = payload.common.audienceSegments.map((item) =>
                            item.id === segment.id
                              ? { ...item, [key]: event.target.value }
                              : item
                          );
                          updateCommon("audienceSegments", next);
                        }}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {step === "operations" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>اقدامات الزامی (هر خط یک مورد)</Label>
            <Textarea
              rows={4}
              value={mandatoryText}
              onChange={(event) =>
                updateCommon("mandatoryActions", linesToList(event.target.value))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>اقدامات پیشنهادی (هر خط یک مورد)</Label>
            <Textarea
              rows={4}
              value={suggestedText}
              onChange={(event) =>
                updateCommon("suggestedActions", linesToList(event.target.value))
              }
            />
          </div>

          {missionType === "crisis_response" && payload.crisis ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["immediateActions", "اقدامات فوری"],
                  ["preparedResponses", "پاسخ‌های آماده‌شده"],
                  ["activeRumors", "شایعات فعال"],
                  ["responseDeadline", "مهلت پاسخ"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Textarea
                    rows={2}
                    value={payload.crisis?.[key] ?? ""}
                    onChange={(event) =>
                      setPayload((prev) => ({
                        ...prev,
                        crisis: prev.crisis
                          ? { ...prev.crisis, [key]: event.target.value }
                          : prev.crisis,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}

          {missionType === "communication_campaign" && payload.campaign ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>بسته‌های اقدام</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPayload((prev) => ({
                      ...prev,
                      campaign: prev.campaign
                        ? {
                            ...prev.campaign,
                            actionPackages: [
                              ...prev.campaign.actionPackages,
                              emptyActionPackage(),
                            ],
                          }
                        : prev.campaign,
                    }))
                  }
                >
                  <Plus className="h-4 w-4" />
                  افزودن بسته
                </Button>
              </div>
              {payload.campaign.actionPackages.map((pkg) => (
                <div key={pkg.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
                  <Input
                    placeholder="عنوان بسته"
                    value={pkg.title}
                    onChange={(event) =>
                      setPayload((prev) => ({
                        ...prev,
                        campaign: prev.campaign
                          ? {
                              ...prev.campaign,
                              actionPackages: prev.campaign.actionPackages.map((item) =>
                                item.id === pkg.id
                                  ? { ...item, title: event.target.value }
                                  : item
                              ),
                            }
                          : prev.campaign,
                      }))
                    }
                  />
                  <Select
                    value={pkg.packageType}
                    onValueChange={(value) =>
                      setPayload((prev) => ({
                        ...prev,
                        campaign: prev.campaign
                          ? {
                              ...prev.campaign,
                              actionPackages: prev.campaign.actionPackages.map((item) =>
                                item.id === pkg.id
                                  ? {
                                      ...item,
                                      packageType: value as typeof pkg.packageType,
                                    }
                                  : item
                              ),
                            }
                          : prev.campaign,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="content">محتوا</SelectItem>
                      <SelectItem value="distribution">توزیع</SelectItem>
                      <SelectItem value="engagement">مشارکت</SelectItem>
                      <SelectItem value="monitoring">پایش</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={pkg.mandatory}
                      onChange={(event) =>
                        setPayload((prev) => ({
                          ...prev,
                          campaign: prev.campaign
                            ? {
                                ...prev.campaign,
                                actionPackages: prev.campaign.actionPackages.map((item) =>
                                  item.id === pkg.id
                                    ? { ...item, mandatory: event.target.checked }
                                    : item
                                ),
                              }
                            : prev.campaign,
                        }))
                      }
                    />
                    الزامی
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setPayload((prev) => ({
                        ...prev,
                        campaign: prev.campaign
                          ? {
                              ...prev.campaign,
                              actionPackages: prev.campaign.actionPackages.filter(
                                (item) => item.id !== pkg.id
                              ),
                            }
                          : prev.campaign,
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {step === "measurement" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Label>شاخص‌های کلیدی (KPI)</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => updateCommon("kpis", [...payload.common.kpis, emptyKpi()])}
            >
              <Plus className="h-4 w-4" />
              افزودن KPI
            </Button>
          </div>
          {payload.common.kpis.map((kpi) => (
            <div key={kpi.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
              {(
                [
                  ["title", "عنوان"],
                  ["baseline", "پایه"],
                  ["target", "هدف"],
                  ["unit", "واحد"],
                  ["dataSource", "منبع داده"],
                  ["evidenceRequired", "مدرک لازم"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={kpi[key]}
                    onChange={(event) => {
                      const next = payload.common.kpis.map((item) =>
                        item.id === kpi.id ? { ...item, [key]: event.target.value } : item
                      );
                      updateCommon("kpis", next);
                    }}
                  />
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="sm:col-span-2"
                onClick={() =>
                  updateCommon(
                    "kpis",
                    payload.common.kpis.filter((item) => item.id !== kpi.id)
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
                حذف
              </Button>
            </div>
          ))}
          <div className="space-y-2">
            <Label>مدارک الزامی کلی</Label>
            <Textarea
              rows={2}
              value={payload.common.evidenceRequired}
              onChange={(event) => updateCommon("evidenceRequired", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>نقش دستگاه‌ها / سازمان‌ها</Label>
            <Textarea
              rows={3}
              value={payload.common.orgRoles}
              onChange={(event) => updateCommon("orgRoles", event.target.value)}
            />
          </div>
        </div>
      ) : null}

      {step === "ai_understanding" ? (
        <div className="space-y-4">
          {!aiConfigured || !aiAvailable ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
              سرویس AI در دسترس نیست یا پیکربندی نشده. می‌توانید این مرحله را رد کنید یا فیلدها را
              دستی پر کنید.
            </div>
          ) : null}
          <Button
            type="button"
            disabled={isPending || !aiAvailable}
            onClick={generateUnderstanding}
          >
            تولید برداشت AI
          </Button>
          {(
            [
              ["mainGoal", "هدف اصلی برداشت‌شده"],
              ["primaryAudience", "مخاطب اصلی"],
              ["desiredChange", "تغییر مطلوب"],
              ["rawSummary", "خلاصه خام"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Textarea
                rows={2}
                value={understanding?.[key] ?? ""}
                onChange={(event) =>
                  setUnderstanding((prev) => ({
                    ...(prev ?? {
                      mainGoal: "",
                      primaryAudience: "",
                      desiredChange: "",
                      mandatoryActions: [],
                      suggestedActions: [],
                      successMetrics: [],
                      responsibleOrgs: [],
                      risks: [],
                      rawSummary: "",
                    }),
                    [key]: event.target.value,
                  }))
                }
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label>اقدامات الزامی (هر خط)</Label>
            <Textarea
              rows={3}
              value={listToLines(understanding?.mandatoryActions ?? [])}
              onChange={(event) =>
                setUnderstanding((prev) =>
                  prev
                    ? { ...prev, mandatoryActions: linesToList(event.target.value) }
                    : prev
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label>اقدامات پیشنهادی (هر خط)</Label>
            <Textarea
              rows={3}
              value={listToLines(understanding?.suggestedActions ?? [])}
              onChange={(event) =>
                setUnderstanding((prev) =>
                  prev
                    ? { ...prev, suggestedActions: linesToList(event.target.value) }
                    : prev
                )
              }
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={applyUnderstanding}>
              اعمال اصلاحات روی فرم
            </Button>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={aiConfirmed}
                onChange={(event) => setAiConfirmed(event.target.checked)}
              />
              برداشت AI را تأیید می‌کنم
            </label>
            {aiRequired ? (
              <Badge variant="destructive">تأیید برای انتشار الزامی است</Badge>
            ) : (
              <Badge variant="outline">AI غیرفعال است — این مرحله اختیاری است</Badge>
            )}
          </div>
        </div>
      ) : null}

      {step === "publish" ? (
        <div className="space-y-4">
          {missionType ? (
            <p className="text-sm text-muted-foreground">
              نوع مأموریت:{" "}
              <span className="font-medium text-foreground">
                {DIRECTIVE_MISSION_TYPE_LABELS[missionType]}
              </span>
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <Label>انتشار برای مخاطبان</Label>
              <p className="text-xs text-muted-foreground">
                ذخیره در سامانه همیشه انجام می‌شود؛ سوئیچ برای کنترل ارسال پیامک است
              </p>
            </div>
            <Switch checked={publish} onCheckedChange={setPublish} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <Label>ارسال پیامک هنگام انتشار</Label>
              <p className="text-xs text-muted-foreground">
                در حالت پیش‌نویس، پیامک ارسال نمی‌شود
              </p>
            </div>
            <Switch
              checked={sendSms}
              onCheckedChange={setSendSms}
              disabled={!publish}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => save(false)}
            >
              ذخیره پیش‌نویس
            </Button>
            <Button type="button" disabled={isPending} onClick={() => save(true)}>
              انتشار
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          انصراف
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={stepIndex <= 0 || isPending}
            onClick={goPrev}
          >
            <ChevronRight className="h-4 w-4" />
            قبلی
          </Button>
          {step !== "publish" ? (
            <Button type="button" disabled={isPending} onClick={goNext}>
              بعدی
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
