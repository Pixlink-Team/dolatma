import type {
  AiMonitoredItemAnalysis,
  MonitoredItem,
  RapidResponseCase,
  ResponseType,
  RiskLevel,
} from "@/lib/monitoring/types";

function inferRisk(item: Pick<MonitoredItem, "riskScore" | "growthRate" | "negativityScore">): RiskLevel {
  if (item.riskScore >= 75 || item.growthRate >= 180) return "critical";
  if (item.riskScore >= 50) return "high";
  if (item.riskScore >= 25) return "medium";
  return "low";
}

function inferResponseType(item: MonitoredItem): ResponseType {
  if (item.negativityScore >= 80 && item.growthRate >= 120) return "combined";
  if ((item.matchedKeyword ?? "").includes("شایعه")) return "denial";
  if (item.platform === "instagram" || item.platform === "telegram") return "clarification";
  return "official_response";
}

/** Deterministic mock AI analysis; replaceable by real provider later. */
export function analyzeMonitoredItem(item: MonitoredItem): AiMonitoredItemAnalysis {
  const riskLevel = inferRisk(item);
  const recommendedResponseType = inferResponseType(item);
  const viralityProbability = Math.min(
    0.95,
    Math.max(0.1, item.growthRate / 250 + item.shareCount / 1000)
  );

  return {
    summary: `خبر «${item.title}» درباره ${item.organizationName ?? "سازمان مرتبط"} با لحن ${item.sentiment} و رشد ${Math.round(item.growthRate)}٪ در حال انتشار است.`,
    whyImportant:
      "ترکیب سرعت رشد، میزان بازنشر و حساسیت موضوع می‌تواند روایت منفی را در ساعات آینده تقویت کند.",
    riskLevel,
    viralityProbability: Number(viralityProbability.toFixed(2)),
    involvedAudiences: ["کاربران شبکه‌های اجتماعی", "رسانه‌های محلی", "مخاطبان خدمت‌گیرنده"],
    recommendedResponseType,
    keyMessages: [
      "تبیین وضعیت واقعی و زمان‌بندی اقدام",
      "ارائه آمار قابل استناد و شفاف",
      "اعلام کانال پیگیری برای شهروندان",
    ],
    recommendedContentFormats: ["متن رسمی", "اینفوگرافیک", "ویدئوی کوتاه توضیحی"],
    recommendedChannels: ["سایت رسمی", "تلگرام", "اینستاگرام"],
    recommendedSpokespeople: ["سخنگوی سازمان", "مدیر روابط عمومی"],
    immediateActions: [
      "تأیید صحت ادعاها ظرف یک ساعت",
      "آماده‌سازی پیام محوری",
      "فعال‌سازی کانال‌های رسمی برای انتشار",
    ],
    responseRisks: [
      "پاسخ شتاب‌زده بدون داده دقیق",
      "تشدید بحث در صورت لحن تدافعی",
    ],
    noResponseRisks: [
      "پر شدن خلأ روایی توسط منابع غیررسمی",
      "گسترش شایعه و افزایش فشار رسانه‌ای",
    ],
    suggestedDeadlineHours:
      riskLevel === "critical" ? 3 : riskLevel === "high" ? 6 : riskLevel === "medium" ? 12 : 24,
    recommendedActions: [
      {
        title: "جمع‌آوری مستندات و آمار دقیق",
        actionType: "research",
        priority: 90,
      },
      {
        title: "تهیه پیش‌نویس پاسخ رسمی",
        actionType: "prepare_response",
        priority: 85,
      },
      {
        title: "تولید اینفوگرافیک توضیحی",
        actionType: "create_image",
        priority: 70,
      },
      {
        title: "انتشار در کانال‌های رسمی",
        actionType: "publish",
        priority: 80,
      },
      {
        title: "رصد اثر پاسخ تا ۶ ساعت بعد",
        actionType: "monitor_result",
        priority: 60,
      },
    ],
  };
}

export function classifySentiment(text: string): MonitoredItem["sentiment"] {
  const negativeHints = ["انتقاد", "اختلال", "تأخیر", "شایعه", "اعتراض", "نارضایتی"];
  const positiveHints = ["افتتاح", "موفقیت", "پیشرفت", "استقبال", "بهبود"];
  const hasNeg = negativeHints.some((h) => text.includes(h));
  const hasPos = positiveHints.some((h) => text.includes(h));
  if (hasNeg && hasPos) return "mixed";
  if (hasNeg) return "negative";
  if (hasPos) return "positive";
  return "neutral";
}

export function calculateRelevance(text: string, keywords: string[]): number {
  if (keywords.length === 0) return 40;
  const hits = keywords.filter((k) => text.includes(k)).length;
  return Math.min(100, Math.round((hits / keywords.length) * 100) || 30);
}

export function suggestRiskLevel(item: MonitoredItem): RiskLevel {
  return inferRisk(item);
}

export function summarizeNegativeNews(item: MonitoredItem): string {
  return analyzeMonitoredItem(item).summary;
}

export function suggestResponseStrategy(item: MonitoredItem): AiMonitoredItemAnalysis {
  return analyzeMonitoredItem(item);
}

export function generateResponseActions(item: MonitoredItem) {
  return analyzeMonitoredItem(item).recommendedActions;
}

export function compareNarratives(negativeReach: number, responseReach: number) {
  const ratio = negativeReach > 0 ? responseReach / negativeReach : 0;
  return {
    coverageRatio: Number(ratio.toFixed(3)),
    leadingNarrative: ratio >= 1 ? "official" : "negative",
    assessment:
      ratio >= 1
        ? "روایت رسمی از نظر پوشش جلوتر است."
        : "خبر منفی همچنان پوشش بیشتری دارد.",
  };
}

export function analyzeCaseEffectiveness(caseItem: RapidResponseCase) {
  return {
    summary: `پرونده ${caseItem.caseNumber} با پوشش پاسخ ${caseItem.responseReach.toLocaleString("fa-IR")} در برابر پوشش منفی ${caseItem.negativeReach.toLocaleString("fa-IR")} ارزیابی شد.`,
    score: caseItem.effectivenessScore ?? 0,
  };
}

export function generateLessonsLearned(caseItem: RapidResponseCase): string {
  return `در پرونده «${caseItem.title}» سرعت واکنش اولیه و انسجام پیام محوری مهم‌ترین عوامل اثرگذاری بودند. پیشنهاد می‌شود ماتریس مسئولان شیفت و کانال‌های بازنشر از پیش آماده باشد.`;
}
