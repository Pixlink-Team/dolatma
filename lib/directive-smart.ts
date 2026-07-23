/**
 * Smart directive (ساخت هوشمند) types, labels, and payload helpers.
 * Stored as JSON on campaign_directives.smart_payload (+ indexed columns).
 */

export const DIRECTIVE_CREATION_MODES = ["normal", "smart"] as const;
export type DirectiveCreationMode = (typeof DIRECTIVE_CREATION_MODES)[number];

export const DIRECTIVE_MISSION_TYPES = [
  "communication_campaign",
  "crisis_response",
  "national_occasion",
  "event_coverage",
  "rumor_media_response",
  "public_information",
  "education_culture",
  "content_production",
  "media_distribution",
  "media_relations",
  "internal_communications",
  "public_participation",
  "media_monitoring",
  "public_demand",
  "performance_report",
] as const;

export type DirectiveMissionType = (typeof DIRECTIVE_MISSION_TYPES)[number];

/** Types with full specialized forms in phase 1 */
export const SPECIALIZED_MISSION_TYPES: DirectiveMissionType[] = [
  "communication_campaign",
  "crisis_response",
  "national_occasion",
  "rumor_media_response",
];

export const DIRECTIVE_MISSION_TYPE_LABELS: Record<DirectiveMissionType, string> = {
  communication_campaign: "کمپین ارتباطی",
  crisis_response: "بحران و واکنش فوری",
  national_occasion: "مناسبت ملی",
  event_coverage: "پوشش رویداد",
  rumor_media_response: "پاسخ به شایعه یا حمله رسانه‌ای",
  public_information: "اطلاع‌رسانی عمومی",
  education_culture: "آموزش و فرهنگ‌سازی",
  content_production: "تولید محتوا",
  media_distribution: "انتشار و توزیع رسانه‌ای",
  media_relations: "روابط رسانه‌ای",
  internal_communications: "ارتباطات داخلی",
  public_participation: "مشارکت مردمی",
  media_monitoring: "افکارسنجی و پایش رسانه",
  public_demand: "مطالبه‌گری عمومی",
  performance_report: "گزارش عملکرد دستگاه",
};

export type CampaignLevel = "national" | "provincial" | "city" | "organizational";
export type SmartCampaignPhase =
  | "design"
  | "preparation"
  | "execution"
  | "consolidation"
  | "ended"
  | "evaluation";

export interface SmartAudienceSegment {
  id: string;
  name: string;
  demographics: string;
  geography: string;
  awarenessLevel: string;
  currentAttitude: string;
  currentBehavior: string;
  mainBarrier: string;
  effectiveMotivation: string;
  suitableChannels: string;
  suitableMessage: string;
  expectedAction: string;
}

export interface SmartKpiItem {
  id: string;
  title: string;
  baseline: string;
  target: string;
  unit: string;
  dataSource: string;
  evidenceRequired: string;
}

export interface SmartActionPackageItem {
  id: string;
  title: string;
  packageType: "content" | "distribution" | "engagement" | "monitoring";
  mandatory: boolean;
  ownerHint: string;
  deadlineHint: string;
}

export interface SmartAiUnderstanding {
  mainGoal: string;
  primaryAudience: string;
  desiredChange: string;
  mandatoryActions: string[];
  suggestedActions: string[];
  successMetrics: string[];
  responsibleOrgs: string[];
  risks: string[];
  rawSummary: string;
  confirmedAt?: string | null;
  confirmedByUserId?: string | null;
  editedByManager?: boolean;
}

/** Shared fields for all smart mission types */
export interface SmartDirectiveCommon {
  problemStatement: string;
  mainGoal: string;
  expectedOutcome: string;
  primaryAudience: string;
  mainMessage: string;
  mandatoryActions: string[];
  suggestedActions: string[];
  kpis: SmartKpiItem[];
  evidenceRequired: string;
  orgRoles: string;
  audienceSegments: SmartAudienceSegment[];
}

export interface SmartCampaignFields {
  campaignName: string;
  mainTopic: string;
  leadOrg: string;
  partnerOrgs: string;
  campaignOwner: string;
  geoScope: string;
  level: CampaignLevel | "";
  phase: SmartCampaignPhase | "";
  problemNow: string;
  publicUnknown: string;
  wrongPerception: string;
  behaviorChange: string;
  messageWeakness: string;
  whyNeeded: string;
  communicativeGoal: string;
  behavioralGoal: string;
  mediaGoal: string;
  supportingMessages: string;
  slogan: string;
  callToAction: string;
  allowedClaims: string;
  forbiddenClaims: string;
  referenceStats: string;
  tone: string;
  keywords: string;
  sensitivities: string;
  doNotSay: string;
  faqAnswers: string;
  criticismAnswers: string;
  messageHierarchy: string;
  actionPackages: SmartActionPackageItem[];
}

export interface SmartCrisisFields {
  crisisLevel: string;
  officialNarrative: string;
  authorizedSpokesperson: string;
  lastConfirmedStatus: string;
  preparedResponses: string;
  activeRumors: string;
  sensitiveMedia: string;
  immediateActions: string;
  responseDeadline: string;
}

export interface SmartOccasionFields {
  occasionName: string;
  occasionDate: string;
  referenceContentPack: string;
  publishCalendar: string;
  mainMessage: string;
  provincialVersions: string;
  ceremonyPlan: string;
  expectedMediaCoverage: string;
}

export interface SmartRumorFields {
  claimTopic: string;
  claimSource: string;
  importanceLevel: string;
  correctNarrative: string;
  citeableEvidence: string;
  approvedResponse: string;
  spokesperson: string;
  targetMedia: string;
  timeLimit: string;
}

export interface SmartDirectivePayload {
  version: 1;
  common: SmartDirectiveCommon;
  campaign?: SmartCampaignFields;
  crisis?: SmartCrisisFields;
  occasion?: SmartOccasionFields;
  rumor?: SmartRumorFields;
  aiUnderstanding?: SmartAiUnderstanding | null;
  knowledgeNotes?: string;
}

export function isDirectiveMissionType(value: unknown): value is DirectiveMissionType {
  return (
    typeof value === "string" &&
    (DIRECTIVE_MISSION_TYPES as readonly string[]).includes(value)
  );
}

export function isDirectiveCreationMode(value: unknown): value is DirectiveCreationMode {
  return value === "normal" || value === "smart";
}

export function isSpecializedMissionType(type: DirectiveMissionType): boolean {
  return SPECIALIZED_MISSION_TYPES.includes(type);
}

export function emptyAudienceSegment(id?: string): SmartAudienceSegment {
  return {
    id: id ?? crypto.randomUUID(),
    name: "",
    demographics: "",
    geography: "",
    awarenessLevel: "",
    currentAttitude: "",
    currentBehavior: "",
    mainBarrier: "",
    effectiveMotivation: "",
    suitableChannels: "",
    suitableMessage: "",
    expectedAction: "",
  };
}

export function emptyKpi(id?: string): SmartKpiItem {
  return {
    id: id ?? crypto.randomUUID(),
    title: "",
    baseline: "",
    target: "",
    unit: "",
    dataSource: "",
    evidenceRequired: "",
  };
}

export function emptyActionPackage(
  packageType: SmartActionPackageItem["packageType"] = "content",
  id?: string
): SmartActionPackageItem {
  return {
    id: id ?? crypto.randomUUID(),
    title: "",
    packageType,
    mandatory: false,
    ownerHint: "",
    deadlineHint: "",
  };
}

export function emptySmartCommon(): SmartDirectiveCommon {
  return {
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
  };
}

export function emptyCampaignFields(): SmartCampaignFields {
  return {
    campaignName: "",
    mainTopic: "",
    leadOrg: "",
    partnerOrgs: "",
    campaignOwner: "",
    geoScope: "",
    level: "",
    phase: "design",
    problemNow: "",
    publicUnknown: "",
    wrongPerception: "",
    behaviorChange: "",
    messageWeakness: "",
    whyNeeded: "",
    communicativeGoal: "",
    behavioralGoal: "",
    mediaGoal: "",
    supportingMessages: "",
    slogan: "",
    callToAction: "",
    allowedClaims: "",
    forbiddenClaims: "",
    referenceStats: "",
    tone: "",
    keywords: "",
    sensitivities: "",
    doNotSay: "",
    faqAnswers: "",
    criticismAnswers: "",
    messageHierarchy: "",
    actionPackages: [],
  };
}

export function emptyCrisisFields(): SmartCrisisFields {
  return {
    crisisLevel: "",
    officialNarrative: "",
    authorizedSpokesperson: "",
    lastConfirmedStatus: "",
    preparedResponses: "",
    activeRumors: "",
    sensitiveMedia: "",
    immediateActions: "",
    responseDeadline: "",
  };
}

export function emptyOccasionFields(): SmartOccasionFields {
  return {
    occasionName: "",
    occasionDate: "",
    referenceContentPack: "",
    publishCalendar: "",
    mainMessage: "",
    provincialVersions: "",
    ceremonyPlan: "",
    expectedMediaCoverage: "",
  };
}

export function emptyRumorFields(): SmartRumorFields {
  return {
    claimTopic: "",
    claimSource: "",
    importanceLevel: "",
    correctNarrative: "",
    citeableEvidence: "",
    approvedResponse: "",
    spokesperson: "",
    targetMedia: "",
    timeLimit: "",
  };
}

export function emptySmartPayload(missionType?: DirectiveMissionType | null): SmartDirectivePayload {
  const payload: SmartDirectivePayload = {
    version: 1,
    common: emptySmartCommon(),
    aiUnderstanding: null,
    knowledgeNotes: "",
  };

  if (missionType === "communication_campaign") {
    payload.campaign = emptyCampaignFields();
  } else if (missionType === "crisis_response") {
    payload.crisis = emptyCrisisFields();
  } else if (missionType === "national_occasion") {
    payload.occasion = emptyOccasionFields();
  } else if (missionType === "rumor_media_response") {
    payload.rumor = emptyRumorFields();
  }

  return payload;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item).trim()).filter(Boolean);
}

export function normalizeSmartPayload(value: unknown): SmartDirectivePayload | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const commonRaw =
    raw.common && typeof raw.common === "object"
      ? (raw.common as Record<string, unknown>)
      : {};

  const common: SmartDirectiveCommon = {
    ...emptySmartCommon(),
    problemStatement: asString(commonRaw.problemStatement),
    mainGoal: asString(commonRaw.mainGoal),
    expectedOutcome: asString(commonRaw.expectedOutcome),
    primaryAudience: asString(commonRaw.primaryAudience),
    mainMessage: asString(commonRaw.mainMessage),
    mandatoryActions: asStringArray(commonRaw.mandatoryActions),
    suggestedActions: asStringArray(commonRaw.suggestedActions),
    evidenceRequired: asString(commonRaw.evidenceRequired),
    orgRoles: asString(commonRaw.orgRoles),
    kpis: Array.isArray(commonRaw.kpis)
      ? commonRaw.kpis.map((item) => {
          const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          return {
            ...emptyKpi(asString(row.id) || undefined),
            title: asString(row.title),
            baseline: asString(row.baseline),
            target: asString(row.target),
            unit: asString(row.unit),
            dataSource: asString(row.dataSource),
            evidenceRequired: asString(row.evidenceRequired),
          };
        })
      : [],
    audienceSegments: Array.isArray(commonRaw.audienceSegments)
      ? commonRaw.audienceSegments.map((item) => {
          const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          return {
            ...emptyAudienceSegment(asString(row.id) || undefined),
            name: asString(row.name),
            demographics: asString(row.demographics),
            geography: asString(row.geography),
            awarenessLevel: asString(row.awarenessLevel),
            currentAttitude: asString(row.currentAttitude),
            currentBehavior: asString(row.currentBehavior),
            mainBarrier: asString(row.mainBarrier),
            effectiveMotivation: asString(row.effectiveMotivation),
            suitableChannels: asString(row.suitableChannels),
            suitableMessage: asString(row.suitableMessage),
            expectedAction: asString(row.expectedAction),
          };
        })
      : [],
  };

  const payload: SmartDirectivePayload = {
    version: 1,
    common,
    aiUnderstanding: null,
    knowledgeNotes: asString(raw.knowledgeNotes),
  };

  if (raw.campaign && typeof raw.campaign === "object") {
    payload.campaign = { ...emptyCampaignFields(), ...(raw.campaign as SmartCampaignFields) };
  }
  if (raw.crisis && typeof raw.crisis === "object") {
    payload.crisis = { ...emptyCrisisFields(), ...(raw.crisis as SmartCrisisFields) };
  }
  if (raw.occasion && typeof raw.occasion === "object") {
    payload.occasion = { ...emptyOccasionFields(), ...(raw.occasion as SmartOccasionFields) };
  }
  if (raw.rumor && typeof raw.rumor === "object") {
    payload.rumor = { ...emptyRumorFields(), ...(raw.rumor as SmartRumorFields) };
  }

  if (raw.aiUnderstanding && typeof raw.aiUnderstanding === "object") {
    const u = raw.aiUnderstanding as Record<string, unknown>;
    payload.aiUnderstanding = {
      mainGoal: asString(u.mainGoal),
      primaryAudience: asString(u.primaryAudience),
      desiredChange: asString(u.desiredChange),
      mandatoryActions: asStringArray(u.mandatoryActions),
      suggestedActions: asStringArray(u.suggestedActions),
      successMetrics: asStringArray(u.successMetrics),
      responsibleOrgs: asStringArray(u.responsibleOrgs),
      risks: asStringArray(u.risks),
      rawSummary: asString(u.rawSummary),
      confirmedAt: u.confirmedAt ? asString(u.confirmedAt) : null,
      confirmedByUserId: u.confirmedByUserId ? asString(u.confirmedByUserId) : null,
      editedByManager: Boolean(u.editedByManager),
    };
  }

  return payload;
}

export const SMART_WIZARD_STEPS = [
  "type",
  "basics",
  "problem_goal",
  "strategy",
  "operations",
  "measurement",
  "ai_understanding",
  "publish",
] as const;

export type SmartWizardStep = (typeof SMART_WIZARD_STEPS)[number];

export const SMART_WIZARD_STEP_LABELS: Record<SmartWizardStep, string> = {
  type: "نوع دستورکار",
  basics: "مشخصات پایه",
  problem_goal: "مسئله و هدف",
  strategy: "راهبرد ارتباطی",
  operations: "برنامه عملیات",
  measurement: "سنجش",
  ai_understanding: "برداشت AI",
  publish: "انتشار",
};

export const AI_ACTION_STATUSES = [
  "suggested",
  "accepted",
  "in_progress",
  "evidence_submitted",
  "approved",
  "done",
  "rejected",
] as const;

export type AiActionStatus = (typeof AI_ACTION_STATUSES)[number];

export const AI_ACTION_REJECT_REASONS = [
  "insufficient_resources",
  "insufficient_time",
  "content_not_ready",
  "manager_approval_missing",
  "channel_unavailable",
  "directive_unclear",
  "not_suitable_for_region",
  "done_but_no_evidence",
  "other",
] as const;

export type AiActionRejectReason = (typeof AI_ACTION_REJECT_REASONS)[number];

export const AI_ACTION_REJECT_REASON_LABELS: Record<AiActionRejectReason, string> = {
  insufficient_resources: "منابع کافی نبود",
  insufficient_time: "زمان کافی نبود",
  content_not_ready: "محتوا آماده نبود",
  manager_approval_missing: "تأیید مدیر دریافت نشد",
  channel_unavailable: "کانال در دسترس نبود",
  directive_unclear: "دستور مبهم بود",
  not_suitable_for_region: "اقدام برای منطقه مناسب نبود",
  done_but_no_evidence: "اقدام انجام شد ولی مدرک ثبت نشد",
  other: "سایر",
};

export const PLAYBOOK_PATTERN_TYPES = [
  "crisis",
  "culture",
  "occasion",
  "behavior_change",
  "service_info",
  "rumor_response",
  "pr_mobilization",
  "provincial",
  "multi_agency",
] as const;

export type PlaybookPatternType = (typeof PLAYBOOK_PATTERN_TYPES)[number];

export const PLAYBOOK_PATTERN_LABELS: Record<PlaybookPatternType, string> = {
  crisis: "الگوی کمپین بحران",
  culture: "الگوی کمپین فرهنگ‌سازی",
  occasion: "الگوی کمپین مناسبتی",
  behavior_change: "الگوی کمپین تغییر رفتار",
  service_info: "الگوی اطلاع‌رسانی خدمات",
  rumor_response: "الگوی مقابله با شایعه",
  pr_mobilization: "الگوی بسیج روابط عمومی‌ها",
  provincial: "الگوی کمپین استانی",
  multi_agency: "الگوی کمپین چنددستگاهی",
};
