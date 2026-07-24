import type { EffectivenessScoreResult } from "@/lib/monitoring/types";

export interface EffectivenessInput {
  responseReach: number;
  negativeReach: number;
  responseSpeedHours: number | null;
  deadlineHours: number | null;
  negativeGrowthBefore: number;
  negativeGrowthAfter: number;
  sentimentBeforeNegativePct: number;
  sentimentAfterNegativePct: number;
  officialNarrativeShare: number;
  targetAudienceCoverage: number;
  participatingOrganizations: number;
  participatingMedia: number;
  correctionOrRemoval: boolean;
  deadlineMet: boolean;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateEffectiveness(
  input: EffectivenessInput
): EffectivenessScoreResult {
  const coverageRatio =
    input.negativeReach > 0 ? input.responseReach / input.negativeReach : 0;

  const coverageScore = clamp(coverageRatio * 70);
  const speedScore =
    input.responseSpeedHours == null || input.deadlineHours == null
      ? 40
      : clamp(100 - (input.responseSpeedHours / Math.max(input.deadlineHours, 1)) * 60);

  const growthReduction = input.negativeGrowthBefore - input.negativeGrowthAfter;
  const growthScore = clamp(50 + growthReduction / 2);

  const sentimentImprovement =
    input.sentimentBeforeNegativePct - input.sentimentAfterNegativePct;
  const sentimentScore = clamp(50 + sentimentImprovement);

  const narrativeScore = clamp(input.officialNarrativeShare);
  const audienceScore = clamp(input.targetAudienceCoverage);
  const orgScore = clamp(input.participatingOrganizations * 15);
  const mediaScore = clamp(input.participatingMedia * 10);
  const correctionScore = input.correctionOrRemoval ? 90 : 45;
  const deadlineScore = input.deadlineMet ? 90 : 35;

  const effectivenessScore = Math.round(
    clamp(
      coverageScore * 0.18 +
        speedScore * 0.14 +
        growthScore * 0.14 +
        sentimentScore * 0.12 +
        narrativeScore * 0.12 +
        audienceScore * 0.08 +
        orgScore * 0.06 +
        mediaScore * 0.06 +
        correctionScore * 0.05 +
        deadlineScore * 0.05
    )
  );

  const successFactors: string[] = [];
  const weaknesses: string[] = [];

  if (coverageRatio >= 1) {
    successFactors.push("پوشش پاسخ از خبر منفی بیشتر شده است");
  } else {
    weaknesses.push("پوشش پاسخ هنوز کمتر از خبر منفی است");
  }
  if (growthReduction > 0) {
    successFactors.push("سرعت رشد خبر منفی کاهش یافته است");
  } else {
    weaknesses.push("رشد خبر منفی هنوز کنترل نشده است");
  }
  if (sentimentImprovement > 0) {
    successFactors.push("احساسات منفی کاهش یافته است");
  } else {
    weaknesses.push("بهبود محسوسی در احساسات دیده نمی‌شود");
  }
  if (input.deadlineMet) {
    successFactors.push("واکنش در مهلت تعیین‌شده انجام شده است");
  } else {
    weaknesses.push("پرونده خارج از مهلت پاسخ داده شده است");
  }
  if (input.officialNarrativeShare >= 40) {
    successFactors.push("سهم روایت رسمی قابل قبول است");
  } else {
    weaknesses.push("سهم روایت رسمی هنوز پایین است");
  }

  const effectivenessLevel =
    effectivenessScore >= 80
      ? "excellent"
      : effectivenessScore >= 65
        ? "good"
        : effectivenessScore >= 45
          ? "fair"
          : "poor";

  const aiFinalAssessment =
    effectivenessLevel === "excellent"
      ? "واکنش موفق بوده و روایت رسمی توانسته کنترل فضای رسانه‌ای را به‌دست بگیرد."
      : effectivenessLevel === "good"
        ? "واکنش اثربخش بوده اما هنوز فرصت بهبود در پوشش و سرعت وجود دارد."
        : effectivenessLevel === "fair"
          ? "واکنش ناقص بوده و نیازمند تقویت کانال‌های انتشار و پیام محوری است."
          : "واکنش ناکافی بوده؛ پیشنهاد می‌شود درس‌آموخته‌ها ثبت و الگوی پاسخ بازنگری شود.";

  return {
    effectivenessScore,
    coverageRatio: Number(coverageRatio.toFixed(3)),
    effectivenessLevel,
    successFactors,
    weaknesses,
    aiFinalAssessment,
  };
}
