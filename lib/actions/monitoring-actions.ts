"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/lib/auth/get-session";
import { generateId, isPostgresConfigured } from "@/lib/utils";
import { assertMonitoringCapability } from "@/lib/monitoring/access";
import { seedMonitoringModule } from "@/lib/monitoring/seed";
import { runMonitoringIngestionJob } from "@/lib/monitoring/jobs/ingestion";
import { analyzeMonitoredItem, generateLessonsLearned } from "@/lib/monitoring/services/ai-analysis";
import { calculateRiskScore } from "@/lib/monitoring/services/risk-scoring";
import { calculateEffectiveness } from "@/lib/monitoring/services/effectiveness";
import {
  buildRapidResponseSms,
  dispatchNotification,
  recipientsForUrgency,
} from "@/lib/monitoring/services/notification";
import { RISK_LABELS } from "@/lib/monitoring/labels";
import type {
  ActionType,
  CaseCreatedByType,
  CaseStatus,
  MonitoredItem,
  MonitoringSystemSettings,
  ResponseType,
  ReviewStatus,
  UrgencyLevel,
} from "@/lib/monitoring/types";
import {
  ensureMonitoringSchema,
  pgCreateAction,
  pgCreateArchive,
  pgCreateAuditEvent,
  pgCreateCase,
  pgCreateCaseContent,
  pgCreateMonitoredItem,
  pgCreateNotification,
  pgCreatePublication,
  pgCreateSnapshot,
  pgGetCampaignMonitoringSettings,
  pgGetCase,
  pgGetDirectiveMonitoringSettings,
  pgGetMonitoredItem,
  pgGetMonitoringDashboard,
  pgGetMonitoringOrganization,
  pgGetMonitoringSettings,
  pgListActions,
  pgListArchives,
  pgListAuditEvents,
  pgListCaseContents,
  pgListCases,
  pgListKeywords,
  pgListMediaSources,
  pgListMonitoredItems,
  pgListMonitoringOrganizations,
  pgListNotifications,
  pgListPublications,
  pgListSnapshots,
  pgListTrends,
  pgSaveMonitoringSettings,
  pgUpdateAction,
  pgUpdateCase,
  pgUpdateMonitoredItem,
  pgUpsertCampaignMonitoringSettings,
  pgUpsertDirectiveMonitoringSettings,
} from "@/lib/db/repository-monitoring";

function revalidateMonitoring() {
  revalidatePath("/admin/monitoring", "layout");
  revalidatePath("/admin/rapid-response", "layout");
}

async function requireSession() {
  const session = await getAuthSession();
  if (!session) throw new Error("برای دسترسی باید وارد شوید.");
  return session;
}

export async function ensureMonitoringReadyAction(campaignId?: string | null) {
  try {
    if (!isPostgresConfigured()) {
      return { success: false as const, error: "پایگاه‌داده پیکربندی نشده است." };
    }
    await requireSession();
    await ensureMonitoringSchema();
    const seed = await seedMonitoringModule(campaignId);
    return { success: true as const, seeded: seed.seeded };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در آماده‌سازی ماژول رصد",
    };
  }
}

export async function getMonitoringDashboardAction() {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "view_dashboard");
    await ensureMonitoringSchema();
    await seedMonitoringModule();
    const data = await pgGetMonitoringDashboard();
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در دریافت داشبورد",
    };
  }
}

export async function listMonitoredItemsAction(
  filters: Parameters<typeof pgListMonitoredItems>[0] = {}
) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "view_feed");
    await seedMonitoringModule(filters?.campaignId);
    const data = await pgListMonitoredItems(filters ?? {});
    return { success: true as const, ...data };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در دریافت اخبار",
      items: [] as MonitoredItem[],
      total: 0,
    };
  }
}

export async function getMonitoredItemAction(id: string) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "view_feed");
    const item = await pgGetMonitoredItem(id);
    if (!item) return { success: false as const, error: "خبر یافت نشد." };
    const similar = await pgListMonitoredItems({
      organizationId: item.organizationId,
      limit: 5,
    });
    return {
      success: true as const,
      item,
      similar: similar.items.filter((s) => s.id !== id).slice(0, 4),
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در دریافت جزئیات خبر",
    };
  }
}

export async function getMonitoringLookupsAction() {
  try {
    await requireSession();
    await seedMonitoringModule();
    const [organizations, sources, keywords, settings] = await Promise.all([
      pgListMonitoringOrganizations(),
      pgListMediaSources(),
      pgListKeywords(),
      pgGetMonitoringSettings(),
    ]);
    return { success: true as const, organizations, sources, keywords, settings };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در دریافت اطلاعات پایه",
    };
  }
}

export async function createMonitoredItemAction(input: {
  organizationId: string;
  title: string;
  summary: string;
  fullText: string;
  sourceUrl?: string | null;
  sourceId?: string | null;
  platform: string;
  authorName?: string | null;
  publishedAt?: string | null;
  thumbnail?: string | null;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  repostCount?: number;
  geographicScope?: string | null;
  provinceId?: string | null;
  sentiment?: MonitoredItem["sentiment"];
  urgencyLevel?: UrgencyLevel;
  suggestedResponseType?: ResponseType | null;
  responseDeadlineHours?: number | null;
  expertNotes?: string | null;
  assignedReviewerId?: string | null;
  relatedCampaignId?: string | null;
  mode: "save" | "submit_review" | "convert_to_case";
}) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "create_item");
    const orgs = await pgListMonitoringOrganizations();
    const org = orgs.find((o) => o.id === input.organizationId);
    const sources = await pgListMediaSources();
    const source = sources.find((s) => s.id === input.sourceId) ?? null;

    const sentiment = input.sentiment ?? "negative";
    const viewCount = input.viewCount ?? 0;
    const shareCount = input.shareCount ?? 0;
    const engagement =
      (input.likeCount ?? 0) + (input.commentCount ?? 0) + shareCount + (input.repostCount ?? 0);
    const risk = calculateRiskScore({
      viewCount,
      growthRate: 100,
      shareCount,
      engagementRate: viewCount > 0 ? (engagement / viewCount) * 100 : 0,
      sourceInfluenceScore: source?.influenceScore ?? 50,
      sourceCredibilityScore: source?.credibilityScore ?? 50,
      negativityScore: sentiment === "negative" ? 75 : 40,
      topicSensitivity: 60,
      geographicSpread: 50,
      numberOfPlatforms: 1,
      numberOfInfluentialAccounts: 0,
      organizationImportance: org?.importanceScore ?? 50,
      viralityProbability: 0.4,
    });

    const item = await pgCreateMonitoredItem({
      organizationId: input.organizationId,
      sourceId: input.sourceId ?? null,
      campaignId: input.relatedCampaignId ?? null,
      directiveId: null,
      title: input.title,
      summary: input.summary,
      fullText: input.fullText,
      sourceUrl: input.sourceUrl ?? null,
      thumbnail: input.thumbnail ?? null,
      platform: input.platform,
      publishedAt: input.publishedAt ?? new Date().toISOString(),
      detectedAt: new Date().toISOString(),
      ingestionType: "manual",
      externalId: null,
      authorName: input.authorName ?? null,
      authorUsername: null,
      sentiment,
      relevanceScore: 80,
      negativityScore: sentiment === "negative" ? 75 : 35,
      riskScore: risk.riskScore,
      urgencyLevel: input.urgencyLevel ?? risk.suggestedUrgency,
      status: input.mode === "submit_review" ? "under_review" : "new",
      reviewStatus: input.mode === "submit_review" ? "pending" : "pending",
      viewCount,
      likeCount: input.likeCount ?? 0,
      commentCount: input.commentCount ?? 0,
      shareCount,
      repostCount: input.repostCount ?? 0,
      engagementCount: engagement,
      growthRate: 100,
      geographicScope: input.geographicScope ?? null,
      provinceId: input.provinceId ?? null,
      cityId: null,
      firstDetectedBy: session.userId,
      assignedReviewerId: input.assignedReviewerId ?? null,
      relatedCampaignId: input.relatedCampaignId ?? null,
      relatedInstructionId: null,
      duplicateOfId: null,
      matchedKeyword: null,
      expertNotes: input.expertNotes ?? null,
      aiAnalysisJson: null,
      suggestedResponseType: input.suggestedResponseType ?? null,
      responseDeadlineHours:
        input.responseDeadlineHours ?? risk.suggestedResponseDeadlineHours,
    });

    await pgCreateAuditEvent({
      rapidResponseCaseId: null,
      monitoredItemId: item.id,
      actorUserId: session.userId,
      actorName: session.name ?? session.email ?? "کاربر",
      eventType: "item_created",
      summary: `خبر دستی «${item.title}» ثبت شد`,
      metadataJson: { mode: input.mode },
    });

    let caseId: string | null = null;
    if (input.mode === "convert_to_case") {
      const created = await convertItemToCaseInternal(item.id, {
        createdByType: "monitoring_team",
      });
      caseId = created.caseId;
    }

    revalidateMonitoring();
    return { success: true as const, item, caseId };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در ثبت خبر",
    };
  }
}

export async function reviewMonitoredItemAction(input: {
  id: string;
  decision: "approve" | "reject_irrelevant" | "mark_duplicate" | "continue_monitoring" | "archive";
  duplicateOfId?: string | null;
  expertNotes?: string | null;
}) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "review_item");
    const item = await pgGetMonitoredItem(input.id);
    if (!item) return { success: false as const, error: "خبر یافت نشد." };

    let status = item.status;
    let reviewStatus: ReviewStatus = item.reviewStatus;
    let duplicateOfId = item.duplicateOfId;

    switch (input.decision) {
      case "approve":
        status = "verified";
        reviewStatus = "approved";
        break;
      case "reject_irrelevant":
        status = "irrelevant";
        reviewStatus = "rejected";
        break;
      case "mark_duplicate":
        status = "duplicate";
        reviewStatus = "rejected";
        duplicateOfId = input.duplicateOfId ?? item.duplicateOfId;
        break;
      case "continue_monitoring":
        status = "monitoring";
        reviewStatus = "approved";
        break;
      case "archive":
        status = "archived";
        break;
    }

    const updated = await pgUpdateMonitoredItem(input.id, {
      status,
      reviewStatus,
      duplicateOfId,
      expertNotes: input.expertNotes ?? item.expertNotes,
    });

    if (input.decision === "archive" && updated) {
      await pgCreateArchive({
        organizationId: updated.organizationId,
        monitoredItemId: updated.id,
        trendId: null,
        rapidResponseCaseId: null,
        archiveType: "negative_news",
        topic: updated.title,
        subTopic: updated.matchedKeyword,
        finalClassification: updated.status,
        finalRiskScore: updated.riskScore,
        finalSentiment: updated.sentiment,
        responseSummary: null,
        finalResult: "انتقال به بانک خبر",
        lessonsLearned: null,
        aiAnalysis: null,
        tags: updated.matchedKeyword ? [updated.matchedKeyword] : [],
        archivedAt: new Date().toISOString(),
        archivedBy: session.userId,
      });
    }

    await pgCreateAuditEvent({
      rapidResponseCaseId: null,
      monitoredItemId: input.id,
      actorUserId: session.userId,
      actorName: session.name ?? session.email ?? "کاربر",
      eventType: "item_reviewed",
      summary: `بررسی خبر با تصمیم «${input.decision}» انجام شد`,
      metadataJson: { decision: input.decision },
    });

    revalidateMonitoring();
    return { success: true as const, item: updated };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در بررسی خبر",
    };
  }
}

async function convertItemToCaseInternal(
  itemId: string,
  options: {
    createdByType?: CaseCreatedByType;
    title?: string;
    description?: string;
    riskLevel?: MonitoredItem["urgencyLevel"] extends infer _ ? import("@/lib/monitoring/types").RiskLevel : never;
    urgencyLevel?: UrgencyLevel;
    responseType?: ResponseType;
    responseDeadlineHours?: number;
    deadline?: string | null;
    assignedOrganizationId?: string | null;
    assignedManagerId?: string | null;
    assignedPublicRelationsManagerId?: string | null;
    assignedShiftOfficerId?: string | null;
    commandText?: string | null;
    requiredActions?: string[];
    expectedOutput?: string | null;
    publishChannels?: string[];
    republishOrganizations?: string[];
    sendNotifications?: boolean;
  }
) {
  const session = await requireSession();
  assertMonitoringCapability(session, "convert_to_case");
  const item = await pgGetMonitoredItem(itemId);
  if (!item) throw new Error("خبر یافت نشد.");

  const ai = analyzeMonitoredItem(item);
  const hours = options.responseDeadlineHours ?? item.responseDeadlineHours ?? ai.suggestedDeadlineHours;
  const deadline =
    options.deadline ?? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const caseNumber = `RR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const created = await pgCreateCase({
    caseNumber,
    organizationId: item.organizationId,
    monitoredItemId: item.id,
    campaignId: item.relatedCampaignId,
    directiveId: item.relatedInstructionId,
    title: options.title ?? `واکنش سریع: ${item.title}`,
    description: options.description ?? item.summary,
    sourceType: item.ingestionType,
    createdByType: options.createdByType ?? "monitoring_team",
    caseStatus: "open",
    riskLevel: options.riskLevel ?? ai.riskLevel,
    urgencyLevel: options.urgencyLevel ?? item.urgencyLevel,
    responseType: options.responseType ?? ai.recommendedResponseType,
    deadline,
    responseDeadlineHours: hours,
    assignedOrganizationId: options.assignedOrganizationId ?? item.organizationId,
    assignedManagerId: options.assignedManagerId ?? null,
    assignedPublicRelationsManagerId: options.assignedPublicRelationsManagerId ?? null,
    assignedShiftOfficerId: options.assignedShiftOfficerId ?? null,
    supervisingCenterId: null,
    commandText: options.commandText ?? null,
    requiredActions: options.requiredActions ?? ai.immediateActions,
    expectedOutput: options.expectedOutput ?? "کنترل روایت منفی و انتشار پاسخ رسمی",
    publishChannels: options.publishChannels ?? ai.recommendedChannels,
    republishOrganizations: options.republishOrganizations ?? [],
    aiSummary: ai.summary,
    aiRecommendation: ai.keyMessages.join(" | "),
    aiAnalysisJson: ai as unknown as Record<string, unknown>,
    negativeReach: item.viewCount,
    responseReach: 0,
    coverageRatio: 0,
    effectivenessScore: null,
    sentimentBefore: item.sentiment,
    sentimentAfter: null,
    openedAt: new Date().toISOString(),
    firstActionAt: null,
    firstPublishAt: null,
    peakGrowthAt: null,
    narrativeControlledAt: null,
    alertSentAt: null,
    closedAt: null,
    createdBy: session.userId,
  });

  await pgUpdateMonitoredItem(item.id, { status: "converted_to_case", reviewStatus: "approved" });

  for (const action of ai.recommendedActions.slice(0, 4)) {
    await pgCreateAction({
      rapidResponseCaseId: created.id,
      title: action.title,
      description: "اقدام پیشنهادی هوش مصنوعی (نیازمند تأیید انسانی)",
      actionType: action.actionType,
      assignedOrganizationId: created.assignedOrganizationId,
      assignedUserId: null,
      status: "pending",
      priority: action.priority,
      deadline,
      startedAt: null,
      completedAt: null,
      resultDescription: null,
      proofUrl: null,
      contentId: null,
      createdBy: session.userId,
    });
  }

  await pgCreateSnapshot({
    rapidResponseCaseId: created.id,
    recordedAt: new Date().toISOString(),
    negativeViews: item.viewCount,
    negativeReach: item.viewCount,
    negativeMentions: item.commentCount,
    negativeShares: item.shareCount,
    responseViews: 0,
    responseReach: 0,
    responseMentions: 0,
    responseShares: 0,
    negativeSentimentPercentage: item.sentiment === "negative" ? 75 : 40,
    positiveSentimentPercentage: 15,
    officialNarrativeShare: 5,
    growthRate: item.growthRate,
    platformMetricsJson: { [item.platform]: item.viewCount },
  });

  await pgCreateAuditEvent({
    rapidResponseCaseId: created.id,
    monitoredItemId: item.id,
    actorUserId: session.userId,
    actorName: session.name ?? session.email ?? "کاربر",
    eventType: "case_created",
    summary: `پرونده ${created.caseNumber} از روی خبر ایجاد شد`,
    metadataJson: { itemId: item.id },
  });

  if (options.sendNotifications !== false) {
    const org = await pgGetMonitoringOrganization(item.organizationId);
    const recipients = recipientsForUrgency(created.urgencyLevel);
    const message = buildRapidResponseSms({
      organizationName: org?.name ?? "سازمان",
      caseTitle: created.title,
      deadlineLabel: `${hours} ساعت`,
      riskLabel: RISK_LABELS[created.riskLevel],
    });
    for (const recipient of recipients) {
      await dispatchNotification(
        {
          recipientName: recipient.name,
          recipientPhone: recipient.phone,
          organizationId: item.organizationId,
          rapidResponseCaseId: created.id,
          monitoredItemId: item.id,
          notificationType: "rapid_response_alert",
          channel: "sms",
          title: "هشدار واکنش سریع",
          message,
          priority: created.urgencyLevel,
        },
        (row) => pgCreateNotification(row)
      );
      await dispatchNotification(
        {
          recipientName: recipient.name,
          organizationId: item.organizationId,
          rapidResponseCaseId: created.id,
          monitoredItemId: item.id,
          notificationType: "rapid_response_alert",
          channel: "in_app",
          title: "هشدار واکنش سریع",
          message,
          priority: created.urgencyLevel,
        },
        (row) => pgCreateNotification(row)
      );
    }
    await pgUpdateCase(created.id, { alertSentAt: new Date().toISOString() });
  }

  return { caseId: created.id, caseNumber: created.caseNumber };
}

export async function convertMonitoredItemToCaseAction(input: {
  itemId: string;
  createdByType?: CaseCreatedByType;
  title?: string;
  description?: string;
  riskLevel?: import("@/lib/monitoring/types").RiskLevel;
  urgencyLevel?: UrgencyLevel;
  responseType?: ResponseType;
  responseDeadlineHours?: number;
  deadline?: string | null;
  assignedOrganizationId?: string | null;
  assignedManagerId?: string | null;
  assignedPublicRelationsManagerId?: string | null;
  assignedShiftOfficerId?: string | null;
  commandText?: string | null;
  requiredActions?: string[];
  expectedOutput?: string | null;
  publishChannels?: string[];
  republishOrganizations?: string[];
  sendNotifications?: boolean;
}) {
  try {
    const result = await convertItemToCaseInternal(input.itemId, input);
    revalidateMonitoring();
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در ایجاد پرونده",
    };
  }
}

export async function getRapidResponseCaseAction(id: string) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "manage_cases");
    const caseItem = await pgGetCase(id);
    if (!caseItem) return { success: false as const, error: "پرونده یافت نشد." };
    const [actions, snapshots, notifications, auditEvents, contents, publications, item] =
      await Promise.all([
        pgListActions(id),
        pgListSnapshots(id),
        pgListNotifications(id),
        pgListAuditEvents(id),
        pgListCaseContents(id),
        pgListPublications(id),
        caseItem.monitoredItemId ? pgGetMonitoredItem(caseItem.monitoredItemId) : Promise.resolve(null),
      ]);
    return {
      success: true as const,
      caseItem,
      actions,
      snapshots,
      notifications,
      auditEvents,
      contents,
      publications,
      item,
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در دریافت پرونده",
    };
  }
}

export async function listRapidResponseCasesAction(filters?: {
  organizationId?: string;
  status?: string;
  campaignId?: string;
}) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "manage_cases");
    await seedMonitoringModule(filters?.campaignId);
    const cases = await pgListCases(filters);
    return { success: true as const, cases };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در دریافت پرونده‌ها",
      cases: [],
    };
  }
}

export async function updateRapidResponseCaseAction(
  id: string,
  patch: Partial<{
    caseStatus: CaseStatus;
    riskLevel: import("@/lib/monitoring/types").RiskLevel;
    urgencyLevel: UrgencyLevel;
    responseType: ResponseType;
    assignedManagerId: string | null;
    assignedPublicRelationsManagerId: string | null;
    assignedShiftOfficerId: string | null;
    deadline: string | null;
    commandText: string | null;
  }>
) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "manage_cases");
    const updated = await pgUpdateCase(id, patch);
    await pgCreateAuditEvent({
      rapidResponseCaseId: id,
      monitoredItemId: updated?.monitoredItemId ?? null,
      actorUserId: session.userId,
      actorName: session.name ?? session.email ?? "کاربر",
      eventType: "case_updated",
      summary: "اطلاعات پرونده به‌روزرسانی شد",
      metadataJson: patch as Record<string, unknown>,
    });
    revalidateMonitoring();
    return { success: true as const, caseItem: updated };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در به‌روزرسانی پرونده",
    };
  }
}

export async function startRapidResponseCaseAction(id: string) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "manage_actions");
    const updated = await pgUpdateCase(id, {
      caseStatus: "action_required",
      firstActionAt: new Date().toISOString(),
    });
    await pgCreateAuditEvent({
      rapidResponseCaseId: id,
      monitoredItemId: updated?.monitoredItemId ?? null,
      actorUserId: session.userId,
      actorName: session.name ?? session.email ?? "کاربر",
      eventType: "case_started",
      summary: "اقدامات پرونده آغاز شد",
      metadataJson: {},
    });
    revalidateMonitoring();
    return { success: true as const, caseItem: updated };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در شروع اقدام",
    };
  }
}

export async function addResponseActionAction(input: {
  caseId: string;
  title: string;
  description?: string;
  actionType: ActionType;
  priority?: number;
  deadline?: string | null;
}) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "manage_actions");
    const action = await pgCreateAction({
      rapidResponseCaseId: input.caseId,
      title: input.title,
      description: input.description ?? "",
      actionType: input.actionType,
      assignedOrganizationId: null,
      assignedUserId: session.userId,
      status: "assigned",
      priority: input.priority ?? 50,
      deadline: input.deadline ?? null,
      startedAt: null,
      completedAt: null,
      resultDescription: null,
      proofUrl: null,
      contentId: null,
      createdBy: session.userId,
    });
    await pgCreateAuditEvent({
      rapidResponseCaseId: input.caseId,
      monitoredItemId: null,
      actorUserId: session.userId,
      actorName: session.name ?? session.email ?? "کاربر",
      eventType: "action_added",
      summary: `اقدام «${input.title}» افزوده شد`,
      metadataJson: { actionId: action.id },
    });
    revalidateMonitoring();
    return { success: true as const, action };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در افزودن اقدام",
    };
  }
}

export async function convertAiSuggestionsToActionsAction(caseId: string, titles?: string[]) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "manage_actions");
    const caseItem = await pgGetCase(caseId);
    if (!caseItem) return { success: false as const, error: "پرونده یافت نشد." };
    const item = caseItem.monitoredItemId
      ? await pgGetMonitoredItem(caseItem.monitoredItemId)
      : null;
    const ai = item
      ? analyzeMonitoredItem(item)
      : {
          recommendedActions: [
            {
              title: "تهیه پاسخ رسمی",
              actionType: "prepare_response" as ActionType,
              priority: 80,
            },
          ],
        };
    const selected = titles?.length
      ? ai.recommendedActions.filter((a) => titles.includes(a.title))
      : ai.recommendedActions;
    const created = [];
    for (const suggestion of selected) {
      created.push(
        await pgCreateAction({
          rapidResponseCaseId: caseId,
          title: suggestion.title,
          description: "تبدیل‌شده از پیشنهاد هوش مصنوعی",
          actionType: suggestion.actionType,
          assignedOrganizationId: caseItem.assignedOrganizationId,
          assignedUserId: null,
          status: "pending",
          priority: suggestion.priority,
          deadline: caseItem.deadline,
          startedAt: null,
          completedAt: null,
          resultDescription: null,
          proofUrl: null,
          contentId: null,
          createdBy: session.userId,
        })
      );
    }
    await pgCreateAuditEvent({
      rapidResponseCaseId: caseId,
      monitoredItemId: caseItem.monitoredItemId,
      actorUserId: session.userId,
      actorName: session.name ?? session.email ?? "کاربر",
      eventType: "ai_actions_converted",
      summary: `${created.length} اقدام از پیشنهاد AI ایجاد شد`,
      metadataJson: {},
    });
    revalidateMonitoring();
    return { success: true as const, actions: created };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در تبدیل پیشنهاد AI",
    };
  }
}

export async function updateResponseActionAction(
  id: string,
  patch: Partial<{
    status: import("@/lib/monitoring/types").ActionStatus;
    resultDescription: string | null;
    proofUrl: string | null;
  }>
) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "manage_actions");
    const updated = await pgUpdateAction(id, {
      ...patch,
      startedAt:
        patch.status === "in_progress" ? new Date().toISOString() : undefined,
      completedAt:
        patch.status === "completed" ? new Date().toISOString() : undefined,
    });
    revalidateMonitoring();
    return { success: true as const, action: updated };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در به‌روزرسانی اقدام",
    };
  }
}

export async function registerCasePublicationAction(input: {
  caseId: string;
  channel: string;
  accountName: string;
  url?: string | null;
  viewCount?: number;
  engagementCount?: number;
  publishingOrganization?: string | null;
}) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "publish");
    const publication = await pgCreatePublication({
      rapidResponseCaseId: input.caseId,
      channel: input.channel,
      accountName: input.accountName,
      url: input.url ?? null,
      publishedAt: new Date().toISOString(),
      viewCount: input.viewCount ?? 0,
      engagementCount: input.engagementCount ?? 0,
      status: "published",
      publishingOrganization: input.publishingOrganization ?? null,
    });
    const caseItem = await pgGetCase(input.caseId);
    if (caseItem) {
      const responseReach = caseItem.responseReach + (input.viewCount ?? 0);
      const coverageRatio =
        caseItem.negativeReach > 0 ? responseReach / caseItem.negativeReach : 0;
      await pgUpdateCase(input.caseId, {
        responseReach,
        coverageRatio,
        firstPublishAt: caseItem.firstPublishAt ?? new Date().toISOString(),
        caseStatus: "impact_monitoring",
      });
      await pgCreateSnapshot({
        rapidResponseCaseId: input.caseId,
        recordedAt: new Date().toISOString(),
        negativeViews: caseItem.negativeReach,
        negativeReach: caseItem.negativeReach,
        negativeMentions: 0,
        negativeShares: 0,
        responseViews: responseReach,
        responseReach,
        responseMentions: 0,
        responseShares: 0,
        negativeSentimentPercentage: 55,
        positiveSentimentPercentage: 30,
        officialNarrativeShare: Math.min(80, coverageRatio * 50),
        growthRate: 40,
        platformMetricsJson: { [input.channel]: input.viewCount ?? 0 },
      });
    }
    await pgCreateAuditEvent({
      rapidResponseCaseId: input.caseId,
      monitoredItemId: null,
      actorUserId: session.userId,
      actorName: session.name ?? session.email ?? "کاربر",
      eventType: "publication_registered",
      summary: `انتشار در ${input.channel} ثبت شد`,
      metadataJson: { publicationId: publication.id },
    });
    revalidateMonitoring();
    return { success: true as const, publication };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در ثبت انتشار",
    };
  }
}

export async function analyzeCaseEffectivenessAction(caseId: string) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "view_analytics");
    const caseItem = await pgGetCase(caseId);
    if (!caseItem) return { success: false as const, error: "پرونده یافت نشد." };
    const snapshots = await pgListSnapshots(caseId);
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const opened = caseItem.openedAt ? new Date(caseItem.openedAt).getTime() : Date.now();
    const firstAction = caseItem.firstActionAt
      ? new Date(caseItem.firstActionAt).getTime()
      : null;
    const result = calculateEffectiveness({
      responseReach: caseItem.responseReach,
      negativeReach: caseItem.negativeReach || 1,
      responseSpeedHours: firstAction ? (firstAction - opened) / 3600000 : null,
      deadlineHours: caseItem.responseDeadlineHours,
      negativeGrowthBefore: first?.growthRate ?? 100,
      negativeGrowthAfter: last?.growthRate ?? 40,
      sentimentBeforeNegativePct: first?.negativeSentimentPercentage ?? 70,
      sentimentAfterNegativePct: last?.negativeSentimentPercentage ?? 45,
      officialNarrativeShare: last?.officialNarrativeShare ?? caseItem.coverageRatio * 50,
      targetAudienceCoverage: Math.min(100, caseItem.coverageRatio * 80),
      participatingOrganizations: Math.max(1, caseItem.republishOrganizations.length),
      participatingMedia: Math.max(1, (await pgListPublications(caseId)).length),
      correctionOrRemoval: false,
      deadlineMet:
        !caseItem.deadline ||
        (caseItem.firstPublishAt != null &&
          new Date(caseItem.firstPublishAt).getTime() <= new Date(caseItem.deadline).getTime()),
    });
    await pgUpdateCase(caseId, {
      effectivenessScore: result.effectivenessScore,
      coverageRatio: result.coverageRatio,
      sentimentAfter: result.effectivenessScore >= 60 ? "mixed" : "negative",
    });
    revalidateMonitoring();
    return { success: true as const, result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در محاسبه اثربخشی",
    };
  }
}

export async function closeRapidResponseCaseAction(caseId: string, finalResult?: string) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "close_case");
    const caseItem = await pgGetCase(caseId);
    if (!caseItem) return { success: false as const, error: "پرونده یافت نشد." };

    const effectiveness = await analyzeCaseEffectivenessAction(caseId);
    const lessons = generateLessonsLearned(caseItem);
    await pgUpdateCase(caseId, {
      caseStatus: "closed",
      closedAt: new Date().toISOString(),
      narrativeControlledAt: new Date().toISOString(),
    });
    await pgCreateArchive({
      organizationId: caseItem.organizationId,
      monitoredItemId: caseItem.monitoredItemId,
      trendId: null,
      rapidResponseCaseId: caseId,
      archiveType: "rapid_response_case",
      topic: caseItem.title,
      subTopic: caseItem.responseType,
      finalClassification: caseItem.riskLevel,
      finalRiskScore: caseItem.effectivenessScore,
      finalSentiment: caseItem.sentimentAfter,
      responseSummary: caseItem.aiRecommendation,
      finalResult: finalResult ?? "پرونده بسته شد",
      lessonsLearned: lessons,
      aiAnalysis:
        effectiveness.success && "result" in effectiveness
          ? effectiveness.result.aiFinalAssessment
          : null,
      tags: [caseItem.riskLevel, caseItem.responseType],
      archivedAt: new Date().toISOString(),
      archivedBy: session.userId,
    });
    await pgCreateAuditEvent({
      rapidResponseCaseId: caseId,
      monitoredItemId: caseItem.monitoredItemId,
      actorUserId: session.userId,
      actorName: session.name ?? session.email ?? "کاربر",
      eventType: "case_closed",
      summary: `پرونده ${caseItem.caseNumber} بسته و به آرشیو منتقل شد`,
      metadataJson: {},
    });
    revalidateMonitoring();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در بستن پرونده",
    };
  }
}

export async function listTrendsAction(campaignId?: string) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "view_feed");
    await seedMonitoringModule(campaignId);
    const trends = await pgListTrends(campaignId);
    return { success: true as const, trends };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در دریافت ترندها",
      trends: [],
    };
  }
}

export async function listArchivesAction(filters?: {
  organizationId?: string;
  archiveType?: string;
  search?: string;
}) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "view_archive");
    await seedMonitoringModule();
    const archives = await pgListArchives(filters);
    return { success: true as const, archives };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در دریافت آرشیو",
      archives: [],
    };
  }
}

export async function getOrganizationMediaIntelligenceAction(organizationId: string) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "view_org_intelligence");
    const organization = await pgGetMonitoringOrganization(organizationId);
    if (!organization) return { success: false as const, error: "سازمان یافت نشد." };
    const [{ items }, cases, trends, archives] = await Promise.all([
      pgListMonitoredItems({ organizationId, limit: 50 }),
      pgListCases({ organizationId, limit: 50 }),
      pgListTrends(),
      pgListArchives({ organizationId }),
    ]);
    const today = new Date().toDateString();
    const negativeToday = items.filter(
      (i) => i.sentiment === "negative" && new Date(i.detectedAt).toDateString() === today
    ).length;
    const unansweredItems = items.filter(
      (i) => i.sentiment === "negative" && i.status !== "converted_to_case" && i.status !== "closed"
    ).length;
    const orgTrends = trends.filter((t) => t.organizationId === organizationId && t.status === "active");
    const openCases = cases.filter((c) => !["closed", "resolved", "rejected"].includes(c.caseStatus));
    const overdueCases = cases.filter(
      (c) =>
        c.caseStatus === "overdue" ||
        (c.deadline && new Date(c.deadline).getTime() < Date.now() && !["closed", "resolved"].includes(c.caseStatus))
    );
    const platformMap = new Map<string, number>();
    const sourceMap = new Map<string, { name: string; count: number; platform: string }>();
    for (const item of items) {
      platformMap.set(item.platform, (platformMap.get(item.platform) ?? 0) + 1);
      const key = item.sourceName ?? "نامشخص";
      const prev = sourceMap.get(key);
      sourceMap.set(key, {
        name: key,
        count: (prev?.count ?? 0) + 1,
        platform: item.platform,
      });
    }
    const topicMap = new Map<string, number>();
    for (const item of items) {
      const topic = item.matchedKeyword ?? "عمومی";
      topicMap.set(topic, (topicMap.get(topic) ?? 0) + 1);
    }

    return {
      success: true as const,
      data: {
        organization,
        negativeToday,
        unansweredItems,
        activeTrends: orgTrends.length,
        openCases: openCases.length,
        overdueCases: overdueCases.length,
        avgResponseHours:
          cases
            .filter((c) => c.openedAt && c.firstActionAt)
            .map(
              (c) =>
                (new Date(c.firstActionAt!).getTime() - new Date(c.openedAt!).getTime()) / 3600000
            )
            .reduce((a, b, _, arr) => a + b / arr.length, 0) || null,
        avgEffectiveness:
          cases
            .filter((c) => c.effectivenessScore != null)
            .reduce((a, c, _, arr) => a + (c.effectivenessScore ?? 0) / arr.length, 0) || null,
        topTopics: [...topicMap.entries()]
          .map(([topic, count]) => ({ topic, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
        activeSources: [...sourceMap.values()].sort((a, b) => b.count - a.count).slice(0, 8),
        platformBreakdown: [...platformMap.entries()].map(([platform, count]) => ({
          platform,
          count,
        })),
        sentimentSeries: [
          {
            label: "۷ روز اخیر",
            positive: items.filter((i) => i.sentiment === "positive").length,
            neutral: items.filter((i) => i.sentiment === "neutral").length,
            negative: items.filter((i) => i.sentiment === "negative").length,
          },
        ],
        monthlyNegative: [
          {
            month: "ماه جاری",
            count: items.filter((i) => i.sentiment === "negative").length,
          },
        ],
        riskTrend: [
          {
            label: "میانگین فعلی",
            avgRisk:
              items.reduce((a, i) => a + i.riskScore, 0) / Math.max(items.length, 1),
          },
        ],
        recentItems: items.slice(0, 10),
        recentCases: cases.slice(0, 8),
        archives: archives.slice(0, 8),
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در دریافت تحلیل سازمان",
    };
  }
}

export async function getCampaignMonitoringAction(campaignId: string) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "view_feed");
    await seedMonitoringModule(campaignId);
    let settings = await pgGetCampaignMonitoringSettings(campaignId);
    if (!settings) {
      settings = await pgUpsertCampaignMonitoringSettings(campaignId, {
        monitoringStatus: "active",
        keywords: ["کمپین"],
      });
    }
    const { items } = await pgListMonitoredItems({ campaignId, limit: 30 });
    const negativeNews = items.filter((i) => i.sentiment === "negative");
    return {
      success: true as const,
      data: {
        settings,
        before: {
          conversationVolume: 4200,
          baselineSentiment: "mixed" as const,
          sensitiveTopics: settings.negativeKeywords.slice(0, 5),
          existingNarratives: settings.competitorNarratives,
          awarenessScore: 58,
        },
        during: {
          reach: items.reduce((a, i) => a + i.viewCount, 0),
          mentions: items.length * 12,
          engagement: items.reduce((a, i) => a + i.engagementCount, 0),
          sentiment: negativeNews.length > items.length / 2 ? ("negative" as const) : ("mixed" as const),
          topHashtags: settings.hashtags.map((tag, idx) => ({ tag, count: 120 - idx * 10 })),
          topSources: [...new Set(items.map((i) => i.sourceName ?? "نامشخص"))]
            .slice(0, 5)
            .map((name, idx) => ({ name, count: 20 - idx })),
          topProvinces: settings.targetProvinces.map((name, idx) => ({
            name,
            count: 40 - idx * 5,
          })),
          negativeNews,
          alerts: negativeNews.filter((i) => i.riskScore >= 50).length,
        },
        after: {
          sentimentChange: 12,
          volumeChange: 28,
          kpiAchievement: 67,
          bestContent: "اینفوگرافیک پاسخ رسمی",
          bestChannel: "تلگرام",
          bestOrganization: settings.organizationNames[0] ?? null,
          weaknesses: ["تأخیر در پاسخ اولیه", "پوشش استانی ناهمگون"],
          aiAnalysis:
            "کمپین توانسته بخشی از روایت رسمی را تقویت کند اما در ساعات اوج نیاز به واکنش سریع‌تری دارد.",
          nextCampaignSuggestions: [
            "تقویت کانال‌های استانی",
            "آماده‌سازی بسته پاسخ از پیش",
            "رصد دقیق‌تر کلیدواژه‌های منفی",
          ],
        },
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در رصد کمپین",
    };
  }
}

export async function updateCampaignMonitoringSettingsAction(
  campaignId: string,
  patch: Parameters<typeof pgUpsertCampaignMonitoringSettings>[1]
) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "manage_settings");
    const settings = await pgUpsertCampaignMonitoringSettings(campaignId, patch);
    revalidateMonitoring();
    return { success: true as const, settings };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در ذخیره تنظیمات رصد کمپین",
    };
  }
}

export async function getDirectiveMonitoringAction(directiveId: string) {
  try {
    await requireSession();
    let settings = await pgGetDirectiveMonitoringSettings(directiveId);
    if (!settings) {
      settings = await pgUpsertDirectiveMonitoringSettings(directiveId, {
        monitoringKind: "announcement",
        monitoringStatus: "active",
        keywords: ["دستورکار"],
      });
    }
    const { items } = await pgListMonitoredItems({ limit: 20 });
    return { success: true as const, settings, items: items.slice(0, 10) };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در رصد دستورکار",
    };
  }
}

export async function updateDirectiveMonitoringSettingsAction(
  directiveId: string,
  patch: Parameters<typeof pgUpsertDirectiveMonitoringSettings>[1]
) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "manage_settings");
    const settings = await pgUpsertDirectiveMonitoringSettings(directiveId, patch);
    revalidateMonitoring();
    return { success: true as const, settings };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در ذخیره تنظیمات رصد دستورکار",
    };
  }
}

export async function saveMonitoringSettingsAction(settings: MonitoringSystemSettings) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "manage_settings");
    const saved = await pgSaveMonitoringSettings(settings);
    revalidateMonitoring();
    return { success: true as const, settings: saved };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در ذخیره تنظیمات",
    };
  }
}

export async function runMonitoringIngestionAction() {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "manage_settings");
    const result = await runMonitoringIngestionJob();
    revalidateMonitoring();
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در اجرای رصد خودکار",
    };
  }
}

export async function createCaseContentAction(input: {
  caseId: string;
  title: string;
  contentType: string;
  bodyText: string;
}) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "produce_content");
    const content = await pgCreateCaseContent({
      rapidResponseCaseId: input.caseId,
      title: input.title,
      contentType: input.contentType,
      bodyText: input.bodyText,
      fileUrl: null,
      productionStatus: "ready",
      approvalStatus: "pending",
      createdBy: session.userId,
      approvedBy: null,
      versionLabel: "1",
      publishUrl: null,
    });
    await pgUpdateCase(input.caseId, { caseStatus: "awaiting_approval" });
    revalidateMonitoring();
    return { success: true as const, content };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در ثبت محتوا",
    };
  }
}

export async function analyzeMonitoredItemAiAction(itemId: string) {
  try {
    const session = await requireSession();
    assertMonitoringCapability(session, "review_item");
    const item = await pgGetMonitoredItem(itemId);
    if (!item) return { success: false as const, error: "خبر یافت نشد." };
    const analysis = analyzeMonitoredItem(item);
    await pgUpdateMonitoredItem(itemId, {
      aiAnalysisJson: analysis as unknown as Record<string, unknown>,
      suggestedResponseType: analysis.recommendedResponseType,
      responseDeadlineHours: analysis.suggestedDeadlineHours,
    });
    revalidateMonitoring();
    return { success: true as const, analysis };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در تحلیل AI",
    };
  }
}

export async function pollingMonitoringUpdatesAction(sinceIso?: string) {
  try {
    await requireSession();
    const since = sinceIso ? new Date(sinceIso).getTime() : Date.now() - 60_000;
    const [{ items }, cases] = await Promise.all([
      pgListMonitoredItems({ limit: 20 }),
      pgListCases({ limit: 20 }),
    ]);
    return {
      success: true as const,
      serverTime: new Date().toISOString(),
      newItems: items.filter((i) => new Date(i.detectedAt).getTime() >= since),
      updatedCases: cases.filter((c) => new Date(c.updatedAt).getTime() >= since),
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "خطا در به‌روزرسانی لحظه‌ای",
      serverTime: new Date().toISOString(),
      newItems: [],
      updatedCases: [],
    };
  }
}

/** Keep generateId import used for potential future draft ids */
void generateId;
