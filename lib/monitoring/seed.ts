import { generateId } from "@/lib/utils";
import {
  ensureMonitoringSchema,
  pgCountMonitoringData,
  pgCreateAction,
  pgCreateArchive,
  pgCreateAuditEvent,
  pgCreateCase,
  pgCreateMonitoredItem,
  pgCreateNotification,
  pgCreateSnapshot,
  pgCreateCaseContent,
  pgCreatePublication,
  pgUpsertCampaignMonitoringSettings,
} from "@/lib/db/repository-monitoring";
import { getSql } from "@/lib/db/client";
import { analyzeMonitoredItem } from "@/lib/monitoring/services/ai-analysis";
import { calculateRiskScore } from "@/lib/monitoring/services/risk-scoring";

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export async function seedMonitoringModule(campaignId?: string | null): Promise<{ seeded: boolean }> {
  await ensureMonitoringSchema();
  const existing = await pgCountMonitoringData();
  if (existing > 0) return { seeded: false };

  const sql = getSql();

  const orgDefs = [
    { name: "وزارت نیرو", shortName: "وزارت نیرو", type: "ministry", importance: 90 },
    { name: "وزارت بهداشت، درمان و آموزش پزشکی", shortName: "وزارت بهداشت", type: "ministry", importance: 92 },
    { name: "وزارت راه و شهرسازی", shortName: "وزارت راه", type: "ministry", importance: 85 },
    { name: "سازمان تأمین اجتماعی", shortName: "تأمین اجتماعی", type: "organization", importance: 80 },
    { name: "شهرداری تهران", shortName: "شهرداری تهران", type: "municipal", importance: 78 },
  ] as const;

  const orgIds: string[] = [];
  for (const org of orgDefs) {
    const id = generateId();
    orgIds.push(id);
    await sql`
      INSERT INTO monitoring_organizations (
        id, name, short_name, organization_type, importance_score, province_id, is_active
      ) VALUES (
        ${id}, ${org.name}, ${org.shortName}, ${org.type}, ${org.importance}, ${"تهران"}, true
      )
    `;
  }

  const keywordDefs: Array<{ orgIndex: number; keyword: string; type: string; sensitive: boolean }> = [
    { orgIndex: 0, keyword: "وزارت نیرو", type: "organization", sensitive: false },
    { orgIndex: 0, keyword: "قطعی برق", type: "sensitive_topic", sensitive: true },
    { orgIndex: 0, keyword: "توسعه شبکه برق", type: "project", sensitive: false },
    { orgIndex: 0, keyword: "مدیرعامل توانیر", type: "manager", sensitive: false },
    { orgIndex: 1, keyword: "وزارت بهداشت", type: "organization", sensitive: false },
    { orgIndex: 1, keyword: "نوبت‌دهی درمان", type: "service", sensitive: true },
    { orgIndex: 1, keyword: "دارو کمیاب", type: "sensitive_topic", sensitive: true },
    { orgIndex: 1, keyword: "#سلامت", type: "hashtag", sensitive: false },
    { orgIndex: 2, keyword: "وزارت راه", type: "organization", sensitive: false },
    { orgIndex: 2, keyword: "ترافیک بزرگراه", type: "sensitive_topic", sensitive: true },
    { orgIndex: 2, keyword: "پروژه مترو", type: "project", sensitive: false },
    { orgIndex: 3, keyword: "تأمین اجتماعی", type: "organization", sensitive: false },
    { orgIndex: 3, keyword: "حقوق بازنشستگی", type: "service", sensitive: true },
    { orgIndex: 3, keyword: "سامانه خدمات غیرحضوری", type: "service", sensitive: false },
    { orgIndex: 4, keyword: "شهرداری تهران", type: "organization", sensitive: false },
    { orgIndex: 4, keyword: "زباله معابر", type: "sensitive_topic", sensitive: true },
    { orgIndex: 4, keyword: "اتوبوس برقی", type: "project", sensitive: false },
    { orgIndex: 0, keyword: "تهران", type: "location", sensitive: false },
    { orgIndex: 1, keyword: "بیمارستان تخصصی", type: "service", sensitive: false },
    { orgIndex: 2, keyword: "ایمنی جاده", type: "sensitive_topic", sensitive: true },
  ];

  for (const kw of keywordDefs) {
    await sql`
      INSERT INTO monitoring_keywords (
        id, organization_id, keyword, keyword_type, is_negative_sensitive, priority, is_active
      ) VALUES (
        ${generateId()}, ${orgIds[kw.orgIndex]}, ${kw.keyword}, ${kw.type}, ${kw.sensitive}, ${kw.sensitive ? 80 : 50}, true
      )
    `;
  }

  const sourceDefs = [
    { name: "خبرگزاری نمونه", type: "news_agency", platform: "news", influence: 78, credibility: 72 },
    { name: "خبرگزاری سلامت", type: "news_agency", platform: "news", influence: 70, credibility: 75 },
    { name: "کانال پیگیری شهری", type: "telegram_channel", platform: "telegram", influence: 66, credibility: 55 },
    { name: "صفحه صدای شهروند", type: "instagram_page", platform: "instagram", influence: 74, credibility: 50 },
    { name: "روزنامه توسعه ملی", type: "newspaper", platform: "news", influence: 68, credibility: 80 },
    { name: "حساب تحلیل‌گر انرژی", type: "x_account", platform: "x", influence: 71, credibility: 58 },
    { name: "اینفلوئنسر حمل‌ونقل", type: "influencer", platform: "instagram", influence: 82, credibility: 45 },
    { name: "وب‌سایت خبری استان", type: "website", platform: "website", influence: 55, credibility: 60 },
    { name: "خبرنگار مستقل خدمات", type: "journalist", platform: "x", influence: 60, credibility: 65 },
    { name: "حساب رسمی وزارت نیرو", type: "official_account", platform: "telegram", influence: 88, credibility: 90 },
    { name: "کانال بازنشستگان", type: "telegram_channel", platform: "telegram", influence: 63, credibility: 52 },
    { name: "صفحه ترافیک تهران", type: "instagram_page", platform: "instagram", influence: 69, credibility: 48 },
    { name: "پایگاه اطلاع‌رسانی راه", type: "website", platform: "website", influence: 57, credibility: 70 },
    { name: "رسانه محلی جنوب", type: "newspaper", platform: "news", influence: 50, credibility: 62 },
    { name: "کانال شایعات شهری", type: "telegram_channel", platform: "telegram", influence: 64, credibility: 30 },
  ];

  const sourceIds: string[] = [];
  for (const s of sourceDefs) {
    const id = generateId();
    sourceIds.push(id);
    await sql`
      INSERT INTO media_sources (
        id, name, source_type, platform, follower_count, credibility_score, influence_score,
        is_verified, is_active, username
      ) VALUES (
        ${id}, ${s.name}, ${s.type}, ${s.platform}, ${10000 + Math.floor(Math.random() * 200000)},
        ${s.credibility}, ${s.influence}, ${s.type === "official_account"}, true, ${s.name.replace(/\s+/g, "_")}
      )
    `;
  }

  const itemTitles = [
    {
      title: "انتقاد کاربران از تأخیر در اجرای طرح توسعه شبکه برق",
      org: 0,
      sentiment: "negative" as const,
      views: 2400,
      growth: 160,
      platform: "instagram",
      auto: true,
    },
    {
      title: "گزارش اختلال موقت در سامانه نوبت‌دهی خدمات شهروندی",
      org: 1,
      sentiment: "negative" as const,
      views: 8700,
      growth: 210,
      platform: "telegram",
      auto: true,
    },
    {
      title: "بازتاب مثبت افتتاح فاز جدید بیمارستان تخصصی",
      org: 1,
      sentiment: "positive" as const,
      views: 5200,
      growth: 45,
      platform: "news",
      auto: true,
    },
    {
      title: "شایعه افزایش ناگهانی عوارض بزرگراهی بدون اطلاع‌رسانی",
      org: 2,
      sentiment: "negative" as const,
      views: 15200,
      growth: 280,
      platform: "x",
      auto: true,
    },
    {
      title: "نارضایتی از صف طولانی خدمات غیرحضوری تأمین اجتماعی",
      org: 3,
      sentiment: "negative" as const,
      views: 6400,
      growth: 95,
      platform: "instagram",
      auto: false,
    },
    {
      title: "انتقاد از جمع‌آوری دیرهنگام پسماند در چند محله تهران",
      org: 4,
      sentiment: "negative" as const,
      views: 3900,
      growth: 120,
      platform: "telegram",
      auto: true,
    },
    {
      title: "تقدیر از نوسازی ناوگان اتوبوس برقی در خطوط منتخب",
      org: 4,
      sentiment: "positive" as const,
      views: 4100,
      growth: 35,
      platform: "news",
      auto: true,
    },
    {
      title: "گزارش کاربران از نوسان ولتاژ در برخی مناطق جنوبی",
      org: 0,
      sentiment: "negative" as const,
      views: 7100,
      growth: 175,
      platform: "x",
      auto: true,
    },
    {
      title: "ابهام درباره زمان واریز معوقات بازنشستگی",
      org: 3,
      sentiment: "negative" as const,
      views: 11200,
      growth: 190,
      platform: "telegram",
      auto: false,
    },
    {
      title: "مقایسه عملکرد استان‌ها در کاهش تصادفات جاده‌ای",
      org: 2,
      sentiment: "mixed" as const,
      views: 4800,
      growth: 55,
      platform: "news",
      auto: true,
    },
  ];

  // Expand to ~30 items by variations
  const allItems: typeof itemTitles = [];
  for (let i = 0; i < 30; i++) {
    const base = itemTitles[i % itemTitles.length];
    allItems.push({
      ...base,
      title: i < itemTitles.length ? base.title : `${base.title} (بازنشر ${i - itemTitles.length + 1})`,
      views: base.views + i * 120,
      growth: Math.max(10, base.growth - (i % 5) * 8),
    });
  }

  const itemIds: string[] = [];
  for (let i = 0; i < allItems.length; i++) {
    const def = allItems[i];
    const source = sourceDefs[i % sourceDefs.length];
    const risk = calculateRiskScore({
      viewCount: def.views,
      growthRate: def.growth,
      shareCount: Math.round(def.views * 0.08),
      engagementRate: 12 + (i % 10),
      sourceInfluenceScore: source.influence,
      sourceCredibilityScore: source.credibility,
      negativityScore: def.sentiment === "negative" ? 70 + (i % 20) : def.sentiment === "mixed" ? 45 : 15,
      topicSensitivity: def.sentiment === "negative" ? 65 : 30,
      geographicSpread: 40 + (i % 40),
      numberOfPlatforms: 1 + (i % 3),
      numberOfInfluentialAccounts: i % 4,
      organizationImportance: orgDefs[def.org].importance,
      viralityProbability: Math.min(0.9, def.growth / 300),
    });

    const id = generateId();
    itemIds.push(id);
    const item = await pgCreateMonitoredItem({
      id,
      organizationId: orgIds[def.org],
      sourceId: sourceIds[i % sourceIds.length],
      campaignId: campaignId ?? null,
      directiveId: null,
      title: def.title,
      summary: `${def.title}. این مورد در جریان رصد رسانه‌ای ثبت شده و نیازمند بررسی کارشناسی است.`,
      fullText: `${def.title}\n\nجزئیات گزارش نشان می‌دهد گفتگو حول این موضوع در پلتفرم ${def.platform} افزایش یافته و کاربران خواستار پاسخ شفاف دستگاه مربوطه هستند.`,
      sourceUrl: `https://example.com/monitoring/item-${i + 1}`,
      thumbnail: null,
      platform: def.platform,
      publishedAt: hoursAgo(2 + i),
      detectedAt: hoursAgo(1 + (i % 12)),
      ingestionType: def.auto ? "automatic" : "manual",
      externalId: def.auto ? `mock-ext-${i + 1}` : null,
      authorName: source.name,
      authorUsername: source.name.replace(/\s+/g, "_"),
      sentiment: def.sentiment,
      relevanceScore: 60 + (i % 30),
      negativityScore: def.sentiment === "negative" ? 70 + (i % 20) : 20,
      riskScore: risk.riskScore,
      urgencyLevel: risk.suggestedUrgency,
      status: i % 7 === 0 ? "verified" : i % 11 === 0 ? "under_review" : "new",
      reviewStatus: i % 7 === 0 ? "approved" : "pending",
      viewCount: def.views,
      likeCount: Math.round(def.views * 0.12),
      commentCount: Math.round(def.views * 0.04),
      shareCount: Math.round(def.views * 0.08),
      repostCount: Math.round(def.views * 0.03),
      engagementCount: Math.round(def.views * 0.27),
      growthRate: def.growth,
      geographicScope: "ملی",
      provinceId: "تهران",
      cityId: null,
      firstDetectedBy: null,
      assignedReviewerId: null,
      relatedCampaignId: campaignId ?? null,
      relatedInstructionId: null,
      duplicateOfId: null,
      matchedKeyword: keywordDefs[def.org]?.keyword ?? orgDefs[def.org].shortName,
      expertNotes: def.sentiment === "negative" ? "اولویت بررسی با تیم رصد شیفت عصر" : null,
      aiAnalysisJson: null,
      suggestedResponseType: risk.riskScore >= 50 ? "clarification" : "monitor_only",
      responseDeadlineHours: risk.suggestedResponseDeadlineHours,
    });

    if (def.sentiment === "negative" && i < 12) {
      const ai = analyzeMonitoredItem({ ...item, organizationName: orgDefs[def.org].name });
      await sql`
        UPDATE monitored_items SET ai_analysis_json = ${sql.json(JSON.parse(JSON.stringify(ai)))} WHERE id = ${id}
      `;
    }
  }

  const trendDefs = [
    { title: "رشد گفتگو درباره قطعی برق", org: 0, growth: 148, mentions: 2200, type: "growing" },
    { title: "ترند نوبت‌دهی درمان", org: 1, growth: 112, mentions: 1800, type: "emerging" },
    { title: "بحث عوارض بزرگراهی", org: 2, growth: 265, mentions: 4100, type: "viral" },
    { title: "معوقات بازنشستگی", org: 3, growth: 95, mentions: 1500, type: "growing" },
    { title: "پسماند شهری تهران", org: 4, growth: 88, mentions: 980, type: "stable" },
    { title: "اتوبوس برقی و حمل‌ونقل پاک", org: 4, growth: 42, mentions: 760, type: "emerging" },
    { title: "ایمنی جاده‌ها در تعطیلات", org: 2, growth: 70, mentions: 1200, type: "growing" },
    { title: "شفافیت آمار خدمات درمانی", org: 1, growth: 55, mentions: 640, type: "stable" },
  ];

  for (const t of trendDefs) {
    await sql`
      INSERT INTO monitoring_trends (
        id, organization_id, campaign_id, title, description, keywords, hashtags, sentiment,
        trend_type, growth_percentage, mention_count, estimated_reach, risk_score, started_at,
        status, sparkline, related_campaign_id
      ) VALUES (
        ${generateId()}, ${orgIds[t.org]}, ${campaignId ?? null}, ${t.title},
        ${`موضوع «${t.title}» در شبکه‌های اجتماعی در حال گسترش است.`},
        ${sql.json([orgDefs[t.org].shortName])}, ${sql.json([`#${orgDefs[t.org].shortName.replace(/\s+/g, "")}`])},
        ${"mixed"}, ${t.type}, ${t.growth}, ${t.mentions}, ${t.mentions * 420},
        ${Math.min(95, Math.round(t.growth / 3))}, ${hoursAgo(30)}, ${"active"},
        ${sql.json([20, 35, 40, 55, 70, 85, t.growth])}, ${campaignId ?? null}
      )
    `;
  }

  const caseDefs = [
    { title: "واکنش به تأخیر طرح توسعه شبکه برق", org: 0, item: 0, risk: "high", urgency: "high", status: "action_required", hours: 6 },
    { title: "پرونده اختلال سامانه نوبت‌دهی", org: 1, item: 1, risk: "critical", urgency: "immediate", status: "content_in_production", hours: 3 },
    { title: "مدیریت شایعه عوارض بزرگراهی", org: 2, item: 3, risk: "critical", urgency: "critical", status: "publishing", hours: 4 },
    { title: "پاسخ به صف خدمات تأمین اجتماعی", org: 3, item: 4, risk: "medium", urgency: "normal", status: "impact_monitoring", hours: 12 },
    { title: "جمع‌آوری پسماند محلات منتخب", org: 4, item: 5, risk: "high", urgency: "high", status: "assigned", hours: 8 },
    { title: "نوسان ولتاژ مناطق جنوبی", org: 0, item: 7, risk: "high", urgency: "critical", status: "open", hours: 5 },
  ] as const;

  const caseIds: string[] = [];
  for (let i = 0; i < caseDefs.length; i++) {
    const def = caseDefs[i];
    const caseId = generateId();
    caseIds.push(caseId);
    const caseNumber = `RR-${new Date().getFullYear()}-${String(1001 + i)}`;
    const openedAt = hoursAgo(10 - i);
    const deadline = hoursFromNow(def.hours - i);
    await pgCreateCase({
      id: caseId,
      caseNumber,
      organizationId: orgIds[def.org],
      monitoredItemId: itemIds[def.item],
      campaignId: campaignId ?? null,
      directiveId: null,
      title: def.title,
      description: `پرونده واکنش سریع برای مدیریت روایت منفی مرتبط با ${orgDefs[def.org].name}.`,
      sourceType: "monitoring_team",
      createdByType: i === 2 ? "central_command" : "monitoring_team",
      caseStatus: def.status,
      riskLevel: def.risk,
      urgencyLevel: def.urgency,
      responseType: "clarification",
      deadline,
      responseDeadlineHours: def.hours,
      assignedOrganizationId: orgIds[def.org],
      assignedManagerId: null,
      assignedPublicRelationsManagerId: null,
      assignedShiftOfficerId: null,
      supervisingCenterId: null,
      commandText:
        i === 2
          ? "مرکز فرمان: ظرف ۴ ساعت پاسخ رسمی منتشر و در استان‌های درگیر بازنشر شود."
          : null,
      requiredActions:
        i === 2
          ? ["تکذیب شایعه با داده رسمی", "انتشار اینفوگرافیک", "بازنشر توسط ادارات کل استانی"]
          : ["تهیه پاسخ", "تأیید مدیریتی", "انتشار"],
      expectedOutput: "کاهش رشد روایت منفی و افزایش سهم روایت رسمی",
      publishChannels: ["telegram", "instagram", "website"],
      republishOrganizations: [orgDefs[def.org].shortName],
      aiSummary: null,
      aiRecommendation: null,
      aiAnalysisJson: null,
      negativeReach: 8000 + i * 2500,
      responseReach: i >= 3 ? 9000 + i * 1800 : 2500 + i * 900,
      coverageRatio: i >= 3 ? 1.1 : 0.4,
      effectivenessScore: i >= 3 ? 72 : null,
      sentimentBefore: "negative",
      sentimentAfter: i >= 3 ? "mixed" : null,
      openedAt,
      firstActionAt: hoursAgo(8 - i),
      firstPublishAt: i >= 2 ? hoursAgo(5 - i) : null,
      peakGrowthAt: hoursAgo(6),
      narrativeControlledAt: i >= 4 ? hoursAgo(2) : null,
      alertSentAt: hoursAgo(9 - i),
      closedAt: null,
      createdBy: null,
    });

    await sql`UPDATE monitored_items SET status = 'converted_to_case' WHERE id = ${itemIds[def.item]}`;

    const actionTitles = [
      { title: "راستی‌آزمایی ادعاها", type: "research", status: "completed" },
      { title: "تهیه پیش‌نویس پاسخ", type: "prepare_response", status: "in_progress" },
      { title: "تولید اینفوگرافیک", type: "create_image", status: i >= 2 ? "completed" : "pending" },
      { title: "تأیید مدیریتی", type: "management_approval", status: i >= 3 ? "completed" : "awaiting_approval" },
    ];
    for (const a of actionTitles) {
      await pgCreateAction({
        rapidResponseCaseId: caseId,
        title: a.title,
        description: `اقدام مرتبط با پرونده ${caseNumber}`,
        actionType: a.type as "research",
        assignedOrganizationId: orgIds[def.org],
        assignedUserId: null,
        status: a.status as "pending",
        priority: 70,
        deadline: hoursFromNow(def.hours),
        startedAt: a.status === "pending" ? null : hoursAgo(4),
        completedAt: a.status === "completed" ? hoursAgo(1) : null,
        resultDescription: a.status === "completed" ? "انجام شد" : null,
        proofUrl: null,
        contentId: null,
        createdBy: null,
      });
    }

    if (i < 3) {
      for (let h = 8; h >= 0; h -= 2) {
        const progress = (8 - h) / 8;
        await pgCreateSnapshot({
          rapidResponseCaseId: caseId,
          recordedAt: hoursAgo(h),
          negativeViews: Math.round(5000 + progress * 8000 + i * 1000),
          negativeReach: Math.round(6000 + progress * 9000 + i * 1200),
          negativeMentions: Math.round(100 + progress * 400),
          negativeShares: Math.round(80 + progress * 300),
          responseViews: Math.round(progress * progress * 7000 + i * 500),
          responseReach: Math.round(progress * progress * 8000 + i * 600),
          responseMentions: Math.round(progress * 200),
          responseShares: Math.round(progress * 180),
          negativeSentimentPercentage: Math.max(35, 80 - progress * 30),
          positiveSentimentPercentage: Math.min(55, 15 + progress * 35),
          officialNarrativeShare: Math.min(60, progress * 55),
          growthRate: Math.max(20, 180 - progress * 100),
          platformMetricsJson: { instagram: 1, telegram: 1 },
        });
      }
    }

    await pgCreateNotification({
      userId: null,
      recipientName: "مسئول شیفت مرکز",
      recipientPhone: "09120000001",
      organizationId: orgIds[def.org],
      rapidResponseCaseId: caseId,
      monitoredItemId: itemIds[def.item],
      notificationType: "rapid_response_alert",
      channel: "sms",
      title: "هشدار واکنش سریع",
      message: `هشدار واکنش سریع راستا\nیک خبر منفی با سطح ریسک بالا درباره ${orgDefs[def.org].name} شناسایی شد.`,
      status: "sent",
      priority: def.urgency,
      sentAt: hoursAgo(9 - i),
      readAt: null,
      failureReason: null,
    });

    await pgCreateAuditEvent({
      rapidResponseCaseId: caseId,
      monitoredItemId: itemIds[def.item],
      actorUserId: null,
      actorName: "سیستم رصد",
      eventType: "case_created",
      summary: `پرونده ${caseNumber} ایجاد شد`,
      metadataJson: { risk: def.risk },
    });

    if (i >= 2) {
      await pgCreateCaseContent({
        rapidResponseCaseId: caseId,
        title: "متن جوابیه رسمی",
        contentType: "text",
        bodyText: `با احترام؛ در خصوص گزارش منتشرشده، توضیحات رسمی دستگاه به شرح زیر اعلام می‌شود...`,
        fileUrl: null,
        productionStatus: "ready",
        approvalStatus: i >= 3 ? "approved" : "pending",
        createdBy: null,
        approvedBy: null,
        versionLabel: "1",
        publishUrl: null,
      });
      await pgCreatePublication({
        rapidResponseCaseId: caseId,
        channel: "telegram",
        accountName: `حساب رسمی ${orgDefs[def.org].shortName}`,
        url: "https://example.com/official-reply",
        publishedAt: hoursAgo(4),
        viewCount: 3200 + i * 800,
        engagementCount: 450 + i * 40,
        status: "published",
        publishingOrganization: orgDefs[def.org].name,
      });
    }
  }

  await pgCreateArchive({
    organizationId: orgIds[0],
    monitoredItemId: itemIds[0],
    trendId: null,
    rapidResponseCaseId: caseIds[0],
    archiveType: "rapid_response_case",
    topic: "توسعه شبکه برق",
    subTopic: "تأخیر پروژه",
    finalClassification: "بحران عملیاتی رسانه‌ای",
    finalRiskScore: 72,
    finalSentiment: "negative",
    responseSummary: "پاسخ روشنگری همراه با زمان‌بندی اجرا منتشر شد.",
    finalResult: "کاهش نسبی رشد روایت منفی",
    lessonsLearned: "اعلام پیش‌دستانه زمان‌بندی پروژه‌ها از شکل‌گیری موج انتقاد جلوگیری می‌کند.",
    aiAnalysis: "موضوع زیرساختی با حساسیت بالا؛ پاسخ داده‌محور مؤثرتر از پاسخ کلی است.",
    tags: ["برق", "زیرساخت", "واکنش سریع"],
    archivedAt: hoursAgo(1),
    archivedBy: null,
  });

  if (campaignId) {
    await pgUpsertCampaignMonitoringSettings(campaignId, {
      keywords: ["اقدام ملی", "روایت رسمی", "دستگاه‌های اجرایی"],
      hashtags: ["#اقدام_ملی", "#رصد_رسانه"],
      slogans: ["هم‌صدایی ملی"],
      spokespersonNames: ["سخنگوی ستاد"],
      organizationNames: orgDefs.map((o) => o.shortName),
      targetPlatforms: ["instagram", "telegram", "news"],
      targetProvinces: ["تهران", "اصفهان", "خراسان رضوی"],
      targetAudience: "افکار عمومی و کنشگران رسانه‌ای",
      competitorNarratives: ["روایت ناکارآمدی دستگاه‌ها"],
      negativeKeywords: ["شکست", "تأخیر", "اختلال"],
      startDate: hoursAgo(72),
      endDate: hoursFromNow(168),
      baselinePeriodDays: 14,
      monitoringStatus: "active",
    });
  }

  return { seeded: true };
}
