import { DEFAULT_MONITORING_SETTINGS } from "@/lib/monitoring/defaults";
import type {
  MonitoringSystemSettings,
  RiskLevel,
  RiskScoreResult,
  UrgencyLevel,
} from "@/lib/monitoring/types";

export interface RiskScoringInput {
  viewCount: number;
  growthRate: number;
  shareCount: number;
  engagementRate: number;
  sourceInfluenceScore: number;
  sourceCredibilityScore: number;
  negativityScore: number;
  topicSensitivity: number;
  geographicSpread: number;
  numberOfPlatforms: number;
  numberOfInfluentialAccounts: number;
  organizationImportance: number;
  viralityProbability: number;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeViews(views: number): number {
  if (views <= 0) return 0;
  return clamp(Math.log10(views + 1) * 25);
}

function normalizeGrowth(growthRate: number): number {
  return clamp(growthRate / 2);
}

function riskLevelFromScore(
  score: number,
  thresholds: MonitoringSystemSettings["alertThresholds"]
): RiskLevel {
  if (score >= thresholds.critical) return "critical";
  if (score >= thresholds.high) return "high";
  if (score >= thresholds.medium) return "medium";
  return "low";
}

function urgencyFromRisk(level: RiskLevel, growthRate: number): UrgencyLevel {
  if (level === "critical" || growthRate >= 200) return "immediate";
  if (level === "high") return "critical";
  if (level === "medium") return "high";
  if (growthRate >= 80) return "normal";
  return "low";
}

function deadlineHours(urgency: UrgencyLevel): number {
  switch (urgency) {
    case "immediate":
      return 2;
    case "critical":
      return 4;
    case "high":
      return 6;
    case "normal":
      return 12;
    default:
      return 24;
  }
}

export function calculateRiskScore(
  input: RiskScoringInput,
  settings: MonitoringSystemSettings = DEFAULT_MONITORING_SETTINGS
): RiskScoreResult {
  const w = settings.riskWeights;
  const factors: Array<{ key: keyof RiskScoringInput; label: string; value: number }> = [
    { key: "viewCount", label: "حجم بازدید", value: normalizeViews(input.viewCount) },
    { key: "growthRate", label: "سرعت رشد", value: normalizeGrowth(input.growthRate) },
    { key: "shareCount", label: "بازنشر", value: clamp(input.shareCount / 20) },
    { key: "engagementRate", label: "نرخ تعامل", value: clamp(input.engagementRate) },
    {
      key: "sourceInfluenceScore",
      label: "نفوذ منبع",
      value: clamp(input.sourceInfluenceScore),
    },
    {
      key: "sourceCredibilityScore",
      label: "اعتبار منبع",
      value: clamp(input.sourceCredibilityScore),
    },
    { key: "negativityScore", label: "شدت منفی بودن", value: clamp(input.negativityScore) },
    { key: "topicSensitivity", label: "حساسیت موضوع", value: clamp(input.topicSensitivity) },
    { key: "geographicSpread", label: "گسترش جغرافیایی", value: clamp(input.geographicSpread) },
    {
      key: "numberOfPlatforms",
      label: "تعدد پلتفرم",
      value: clamp(input.numberOfPlatforms * 20),
    },
    {
      key: "numberOfInfluentialAccounts",
      label: "حساب‌های اثرگذار",
      value: clamp(input.numberOfInfluentialAccounts * 15),
    },
    {
      key: "organizationImportance",
      label: "اهمیت سازمان",
      value: clamp(input.organizationImportance),
    },
    {
      key: "viralityProbability",
      label: "احتمال وایرال",
      value: clamp(input.viralityProbability * 100),
    },
  ];

  let weighted = 0;
  let weightSum = 0;
  const riskReasons: string[] = [];

  for (const factor of factors) {
    const weight = w[factor.key] ?? 0;
    weighted += factor.value * weight;
    weightSum += weight;
    if (factor.value >= 60) {
      riskReasons.push(`${factor.label} بالاست (${Math.round(factor.value)})`);
    }
  }

  const riskScore = Math.round(clamp(weightSum > 0 ? weighted / weightSum : 0));
  const riskLevel = riskLevelFromScore(riskScore, settings.alertThresholds);
  const suggestedUrgency = urgencyFromRisk(riskLevel, input.growthRate);

  if (riskReasons.length === 0) {
    riskReasons.push("شاخص‌های فعلی در محدوده کنترل‌پذیر هستند");
  }

  return {
    riskScore,
    riskLevel,
    riskReasons,
    suggestedUrgency,
    suggestedResponseDeadlineHours: deadlineHours(suggestedUrgency),
  };
}
