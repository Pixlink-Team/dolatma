"use client";

import { useMemo, useState } from "react";
import { AiActionAssistantPanel } from "@/components/admin/ai-action-assistant-panel";
import { DirectiveAutopsyPanel } from "@/components/admin/directive-autopsy-panel";
import { DirectiveMemoryPanel } from "@/components/admin/directive-memory-panel";
import { DirectivePlaybooksAdmin } from "@/components/admin/directive-playbooks-admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DIRECTIVE_MISSION_TYPE_LABELS,
  normalizeSmartPayload,
  type DirectiveMissionType,
  type SmartDirectivePayload,
} from "@/lib/directive-smart";
import type { CampaignDirective, DirectiveWorkspaceBundle } from "@/lib/types";

interface DirectiveSmartOpsRoomProps {
  campaignId: string;
  canManage: boolean;
  directive: CampaignDirective;
  bundle?: DirectiveWorkspaceBundle | null;
  currentUserId?: string | null;
  isFullAdmin?: boolean;
}

function FieldBlock({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function ListBlock({ label, values }: { label: string; values?: string[] }) {
  if (!values?.length) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <ul className="list-disc pr-5 text-sm space-y-1">
        {values.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function CampaignOps({ payload }: { payload: SmartDirectivePayload }) {
  const campaign = payload.campaign;
  const common = payload.common;
  if (!campaign) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">اهداف</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FieldBlock label="هدف اصلی" value={common.mainGoal} />
          <FieldBlock label="هدف ارتباطی" value={campaign.communicativeGoal} />
          <FieldBlock label="هدف رفتاری" value={campaign.behavioralGoal} />
          <FieldBlock label="هدف رسانه‌ای" value={campaign.mediaGoal} />
          <FieldBlock label="نتیجه مورد انتظار" value={common.expectedOutcome} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">پیام‌ها</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FieldBlock label="پیام اصلی" value={common.mainMessage || campaign.mainTopic} />
          <FieldBlock label="شعار" value={campaign.slogan} />
          <FieldBlock label="فراخوان اقدام" value={campaign.callToAction} />
          <FieldBlock label="پیام‌های پشتیبان" value={campaign.supportingMessages} />
          <FieldBlock label="سلسله‌مراتب پیام" value={campaign.messageHierarchy} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">مخاطبان</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FieldBlock label="مخاطب اصلی" value={common.primaryAudience} />
          {common.audienceSegments.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {common.audienceSegments.map((segment) => (
                <li key={segment.id} className="rounded-lg border p-2">
                  <p className="font-medium">{segment.name || "بخش مخاطب"}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {[segment.demographics, segment.geography, segment.suitableChannels]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">فاز و کانال</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FieldBlock label="فاز" value={campaign.phase} />
          <FieldBlock label="سطح" value={campaign.level} />
          <FieldBlock label="قلمرو جغرافیایی" value={campaign.geoScope} />
          <FieldBlock label="دستگاه راهبر" value={campaign.leadOrg} />
          <FieldBlock label="شرکا" value={campaign.partnerOrgs} />
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">KPI و بسته‌های اقدام</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {common.kpis.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {common.kpis.map((kpi) => (
                <div key={kpi.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{kpi.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    پایه: {kpi.baseline || "—"} · هدف: {kpi.target || "—"} {kpi.unit}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">KPI ثبت نشده است.</p>
          )}
          {campaign.actionPackages.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {campaign.actionPackages.map((pkg) => (
                <div key={pkg.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{pkg.title}</p>
                    {pkg.mandatory ? <Badge variant="destructive">الزامی</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pkg.packageType}
                    {pkg.ownerHint ? ` · ${pkg.ownerHint}` : ""}
                    {pkg.deadlineHint ? ` · ${pkg.deadlineHint}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          <ListBlock label="اقدامات الزامی" values={common.mandatoryActions} />
          <ListBlock label="اقدامات پیشنهادی" values={common.suggestedActions} />
        </CardContent>
      </Card>
    </div>
  );
}

function CrisisOps({ payload }: { payload: SmartDirectivePayload }) {
  const crisis = payload.crisis;
  if (!crisis) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">وضعیت بحران</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FieldBlock label="سطح بحران" value={crisis.crisisLevel} />
          <FieldBlock label="روایت رسمی" value={crisis.officialNarrative} />
          <FieldBlock label="سخنگوی مجاز" value={crisis.authorizedSpokesperson} />
          <FieldBlock label="آخرین وضعیت تأییدشده" value={crisis.lastConfirmedStatus} />
          <FieldBlock label="مهلت پاسخ" value={crisis.responseDeadline} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">اقدام فوری و شایعات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FieldBlock label="اقدامات فوری" value={crisis.immediateActions} />
          <FieldBlock label="پاسخ‌های آماده‌شده" value={crisis.preparedResponses} />
          <FieldBlock label="شایعات فعال" value={crisis.activeRumors} />
          <FieldBlock label="رسانه‌های حساس" value={crisis.sensitiveMedia} />
        </CardContent>
      </Card>
      <CommonFallback payload={payload} />
    </div>
  );
}

function OccasionOps({ payload }: { payload: SmartDirectivePayload }) {
  const occasion = payload.occasion;
  if (!occasion) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">مناسبت</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FieldBlock label="نام مناسبت" value={occasion.occasionName} />
          <FieldBlock label="تاریخ" value={occasion.occasionDate} />
          <FieldBlock label="پیام اصلی" value={occasion.mainMessage} />
          <FieldBlock label="بسته محتوای مرجع" value={occasion.referenceContentPack} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">تقویم و پوشش</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FieldBlock label="تقویم انتشار" value={occasion.publishCalendar} />
          <FieldBlock label="نسخه‌های استانی" value={occasion.provincialVersions} />
          <FieldBlock label="برنامه مراسم" value={occasion.ceremonyPlan} />
          <FieldBlock label="پوشش رسانه‌ای مورد انتظار" value={occasion.expectedMediaCoverage} />
        </CardContent>
      </Card>
      <CommonFallback payload={payload} />
    </div>
  );
}

function RumorOps({ payload }: { payload: SmartDirectivePayload }) {
  const rumor = payload.rumor;
  if (!rumor) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">ادعای شایعه</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FieldBlock label="موضوع ادعا" value={rumor.claimTopic} />
          <FieldBlock label="منبع ادعا" value={rumor.claimSource} />
          <FieldBlock label="اهمیت" value={rumor.importanceLevel} />
          <FieldBlock label="مهلت زمانی" value={rumor.timeLimit} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">پاسخ تأییدشده</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FieldBlock label="روایت صحیح" value={rumor.correctNarrative} />
          <FieldBlock label="شواهد قابل استناد" value={rumor.citeableEvidence} />
          <FieldBlock label="پاسخ مصوب" value={rumor.approvedResponse} />
          <FieldBlock label="سخنگو" value={rumor.spokesperson} />
          <FieldBlock label="رسانه‌های هدف" value={rumor.targetMedia} />
        </CardContent>
      </Card>
      <CommonFallback payload={payload} />
    </div>
  );
}

function CommonFallback({ payload }: { payload: SmartDirectivePayload }) {
  const common = payload.common;
  return (
    <Card className="md:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">چارچوب مشترک</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <FieldBlock label="بیان مسئله" value={common.problemStatement} />
        <FieldBlock label="هدف اصلی" value={common.mainGoal} />
        <FieldBlock label="نتیجه مورد انتظار" value={common.expectedOutcome} />
        <FieldBlock label="مخاطب اصلی" value={common.primaryAudience} />
        <FieldBlock label="پیام اصلی" value={common.mainMessage} />
        <FieldBlock label="نقش دستگاه‌ها" value={common.orgRoles} />
        <FieldBlock label="مدرک الزامی" value={common.evidenceRequired} />
        <ListBlock label="اقدامات الزامی" values={common.mandatoryActions} />
        <ListBlock label="اقدامات پیشنهادی" values={common.suggestedActions} />
      </CardContent>
    </Card>
  );
}

function AdaptiveOpsContent({
  missionType,
  payload,
}: {
  missionType: DirectiveMissionType | null | undefined;
  payload: SmartDirectivePayload;
}) {
  if (missionType === "communication_campaign") {
    return <CampaignOps payload={payload} />;
  }
  if (missionType === "crisis_response") {
    return <CrisisOps payload={payload} />;
  }
  if (missionType === "national_occasion") {
    return <OccasionOps payload={payload} />;
  }
  if (missionType === "rumor_media_response") {
    return <RumorOps payload={payload} />;
  }
  return (
    <div className="grid gap-4">
      <CommonFallback payload={payload} />
    </div>
  );
}

export function DirectiveSmartOpsRoom({
  campaignId,
  canManage,
  directive,
  currentUserId = null,
  isFullAdmin = false,
}: DirectiveSmartOpsRoomProps) {
  const [tab, setTab] = useState("ops");
  const payload = useMemo(
    () => normalizeSmartPayload(directive.smartPayload) ?? {
      version: 1 as const,
      common: {
        problemStatement: "",
        mainGoal: "",
        expectedOutcome: "",
        primaryAudience: "",
        mainMessage: "",
        mandatoryActions: [],
        suggestedActions: [],
        kpis: [],
        evidenceRequired: "",
        orgRoles: "",
        audienceSegments: [],
      },
      aiUnderstanding: null,
      knowledgeNotes: "",
    },
    [directive.smartPayload]
  );

  const isCreator =
    Boolean(currentUserId) && directive.createdByUserId === currentUserId;
  const canAutopsy = canManage && (isCreator || isFullAdmin);
  const canMemory = isCreator || isFullAdmin;

  const missionLabel = directive.missionType
    ? DIRECTIVE_MISSION_TYPE_LABELS[directive.missionType]
    : "نامشخص";

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">اتاق عملیات هوشمند</h2>
          <p className="mt-1 text-sm text-muted-foreground">{directive.title}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{missionLabel}</Badge>
            <Badge variant="outline">ساخت هوشمند</Badge>
            {directive.priority === "urgent" ? (
              <Badge variant="destructive">فوری</Badge>
            ) : null}
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} dir="rtl">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="ops">عملیات</TabsTrigger>
          <TabsTrigger value="assistant">دستیار اقدام</TabsTrigger>
          {canAutopsy ? <TabsTrigger value="autopsy">کالبدشکافی</TabsTrigger> : null}
          {canMemory ? <TabsTrigger value="memory">دانش استخراج‌شده</TabsTrigger> : null}
          {isFullAdmin ? <TabsTrigger value="playbooks">الگو</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="ops" className="mt-4">
          <AdaptiveOpsContent missionType={directive.missionType} payload={payload} />
        </TabsContent>

        <TabsContent value="assistant" className="mt-4">
          <AiActionAssistantPanel directiveId={directive.id} canManage={canManage} />
        </TabsContent>

        {canAutopsy ? (
          <TabsContent value="autopsy" className="mt-4">
            <DirectiveAutopsyPanel directiveId={directive.id} />
          </TabsContent>
        ) : null}

        {canMemory ? (
          <TabsContent value="memory" className="mt-4">
            <DirectiveMemoryPanel
              directiveId={directive.id}
              campaignId={campaignId}
              isFullAdmin={isFullAdmin}
            />
          </TabsContent>
        ) : null}

        {isFullAdmin ? (
          <TabsContent value="playbooks" className="mt-4">
            <DirectivePlaybooksAdmin sourceDirectiveId={directive.id} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
