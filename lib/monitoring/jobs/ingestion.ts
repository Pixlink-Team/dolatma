import {
  getMonitoringProvider,
  normalizeExternalItem,
} from "@/lib/monitoring/services/monitoring-provider";
import { classifySentiment, calculateRelevance } from "@/lib/monitoring/services/ai-analysis";
import { calculateRiskScore } from "@/lib/monitoring/services/risk-scoring";
import {
  ensureMonitoringSchema,
  pgCreateAuditEvent,
  pgCreateMonitoredItem,
  pgGetMonitoringSettings,
  pgListKeywords,
  pgListMediaSources,
  pgListMonitoringOrganizations,
  pgListMonitoredItems,
} from "@/lib/db/repository-monitoring";

export async function runMonitoringIngestionJob(): Promise<{
  fetched: number;
  inserted: number;
  skippedDuplicates: number;
}> {
  await ensureMonitoringSchema();
  const settings = await pgGetMonitoringSettings();
  const provider = getMonitoringProvider();
  const orgs = await pgListMonitoringOrganizations();
  const keywords = await pgListKeywords();
  const sources = await pgListMediaSources();

  const activeKeywords = keywords.filter((k) => k.isActive).map((k) => k.keyword);
  const raw = await provider.searchByKeywords(activeKeywords);
  const normalized = raw.map(normalizeExternalItem);

  let inserted = 0;
  let skippedDuplicates = 0;

  for (const item of normalized) {
    const existing = await pgListMonitoredItems({
      search: item.title.slice(0, 40),
      limit: 5,
    });
    const duplicate = existing.items.find(
      (row) =>
        row.externalId === item.externalId ||
        (row.title === item.title &&
          Math.abs(new Date(row.detectedAt).getTime() - Date.now()) <
            settings.duplicateWindowHours * 3600 * 1000)
    );
    if (duplicate) {
      skippedDuplicates += 1;
      continue;
    }

    const matchedKeyword =
      item.matchedKeyword ??
      activeKeywords.find((k) => item.title.includes(k) || item.summary.includes(k)) ??
      null;
    const org =
      orgs.find((o) => matchedKeyword && (o.name.includes(matchedKeyword) || o.shortName.includes(matchedKeyword))) ??
      orgs.find((o) => item.title.includes(o.shortName) || item.summary.includes(o.shortName)) ??
      orgs[0];
    if (!org) continue;

    const source =
      sources.find((s) => s.name === item.sourceName) ??
      sources.find((s) => s.platform === item.platform) ??
      null;

    const sentiment =
      item.sentimentHint ?? classifySentiment(`${item.title} ${item.summary} ${item.fullText}`);
    const relevanceScore = calculateRelevance(`${item.title} ${item.summary}`, activeKeywords);
    const negativityScore =
      sentiment === "negative" ? 75 : sentiment === "mixed" ? 45 : sentiment === "positive" ? 10 : 25;

    const risk = calculateRiskScore({
      viewCount: item.viewCount,
      growthRate: 80,
      shareCount: item.shareCount,
      engagementRate:
        item.viewCount > 0
          ? ((item.likeCount + item.commentCount + item.shareCount) / item.viewCount) * 100
          : 0,
      sourceInfluenceScore: source?.influenceScore ?? 50,
      sourceCredibilityScore: source?.credibilityScore ?? 50,
      negativityScore,
      topicSensitivity: matchedKeyword && keywords.some((k) => k.keyword === matchedKeyword && k.isNegativeSensitive) ? 80 : 40,
      geographicSpread: 50,
      numberOfPlatforms: 1,
      numberOfInfluentialAccounts: (source?.influenceScore ?? 0) >= 70 ? 1 : 0,
      organizationImportance: org.importanceScore,
      viralityProbability: Math.min(0.9, item.shareCount / 500),
    });

    if (risk.riskScore < settings.alertThresholds.medium && sentiment !== "negative") {
      continue;
    }

    const created = await pgCreateMonitoredItem({
      organizationId: org.id,
      sourceId: source?.id ?? null,
      campaignId: null,
      directiveId: null,
      title: item.title,
      summary: item.summary,
      fullText: item.fullText,
      sourceUrl: item.sourceUrl,
      thumbnail: item.thumbnail,
      platform: item.platform,
      publishedAt: item.publishedAt,
      detectedAt: new Date().toISOString(),
      ingestionType: "automatic",
      externalId: item.externalId,
      authorName: item.authorName,
      authorUsername: item.authorUsername,
      sentiment,
      relevanceScore,
      negativityScore,
      riskScore: risk.riskScore,
      urgencyLevel: risk.suggestedUrgency,
      status: "new",
      reviewStatus: "pending",
      viewCount: item.viewCount,
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      shareCount: item.shareCount,
      repostCount: item.repostCount,
      engagementCount: item.engagementCount,
      growthRate: 80,
      geographicScope: null,
      provinceId: source?.provinceId ?? null,
      cityId: source?.cityId ?? null,
      firstDetectedBy: null,
      assignedReviewerId: null,
      relatedCampaignId: null,
      relatedInstructionId: null,
      duplicateOfId: null,
      matchedKeyword,
      expertNotes: null,
      aiAnalysisJson: null,
      suggestedResponseType: risk.riskScore >= 50 ? "clarification" : "monitor_only",
      responseDeadlineHours: risk.suggestedResponseDeadlineHours,
    });

    await pgCreateAuditEvent({
      rapidResponseCaseId: null,
      monitoredItemId: created.id,
      actorUserId: null,
      actorName: "سیستم رصد خودکار",
      eventType: "item_ingested",
      summary: `خبر خودکار «${created.title}» با امتیاز ریسک ${risk.riskScore} ذخیره شد`,
      metadataJson: { provider: provider.id, risk: risk.riskLevel },
    });

    inserted += 1;
  }

  return { fetched: normalized.length, inserted, skippedDuplicates };
}
