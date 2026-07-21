import type {
  CampaignDirective,
  DirectiveFunnelStage,
  DirectiveRecipient,
  DirectiveSmsStatus,
} from "@/lib/types";
import { DIRECTIVE_FUNNEL_STAGES } from "@/lib/command-feature-labels";

function isDelivered(smsStatus: DirectiveSmsStatus, published: boolean): boolean {
  if (smsStatus === "sent" || smsStatus === "skipped" || smsStatus === "no_phone") return true;
  // Published without pending SMS delivery still counts as delivered for funnel display.
  return published && smsStatus !== "pending" && smsStatus !== "failed";
}

export function resolveRecipientFunnelStage(
  recipient: Pick<
    DirectiveRecipient,
    | "smsStatus"
    | "seenAt"
    | "confirmed"
    | "hasActionPlan"
    | "executedAt"
    | "executionVerifiedAt"
  >,
  options?: { published?: boolean }
): DirectiveFunnelStage {
  const published = options?.published !== false;
  if (recipient.executionVerifiedAt) return "verified";
  if (recipient.executedAt) return "executed";
  if (recipient.hasActionPlan) return "planned";
  if (recipient.confirmed) return "accepted";
  if (recipient.seenAt) return "seen";
  if (isDelivered(recipient.smsStatus, published)) return "delivered";
  return "sent";
}

export function funnelStageIndex(stage: DirectiveFunnelStage): number {
  return DIRECTIVE_FUNNEL_STAGES.indexOf(stage);
}

export function countFunnelStages(
  recipients: DirectiveRecipient[],
  options?: { published?: boolean }
): Record<DirectiveFunnelStage, number> {
  const counts = Object.fromEntries(
    DIRECTIVE_FUNNEL_STAGES.map((stage) => [stage, 0])
  ) as Record<DirectiveFunnelStage, number>;

  for (const recipient of recipients) {
    const stage = resolveRecipientFunnelStage(recipient, options);
    counts[stage] += 1;
  }
  return counts;
}

export function directiveHasDateOverlap(
  aStart: string | null | undefined,
  aEnd: string | null | undefined,
  bStart: string | null | undefined,
  bEnd: string | null | undefined
): boolean {
  const startA = aStart?.trim() || null;
  const endA = aEnd?.trim() || startA;
  const startB = bStart?.trim() || null;
  const endB = bEnd?.trim() || startB;
  if (!startA || !endA || !startB || !endB) return false;
  return startA <= endB && startB <= endA;
}

export function normalizeConflictTopic(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/\u064A/g, "\u06CC")
    .replace(/\u0643/g, "\u06A9")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function detectCalendarConflict(input: {
  deviceId?: string | null;
  provinces?: string[];
  topic?: string | null;
  other: {
    deviceId?: string | null;
    provinces?: string[];
    topic?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  };
  startDate?: string | null;
  endDate?: string | null;
}): boolean {
  const deviceMatch =
    Boolean(input.deviceId) &&
    Boolean(input.other.deviceId) &&
    input.deviceId === input.other.deviceId;
  if (!deviceMatch) return false;

  const topicA = normalizeConflictTopic(input.topic);
  const topicB = normalizeConflictTopic(input.other.topic);
  if (!topicA || !topicB || topicA !== topicB) return false;

  const provincesA = new Set((input.provinces ?? []).map((p) => p.trim()).filter(Boolean));
  const provincesB = (input.other.provinces ?? []).map((p) => p.trim()).filter(Boolean);
  const provinceMatch = provincesB.some((p) => provincesA.has(p));
  if (!provinceMatch) return false;

  return directiveHasDateOverlap(
    input.startDate,
    input.endDate,
    input.other.startDate,
    input.other.endDate
  );
}

export function summarizeDirectiveFunnel(
  directive: CampaignDirective,
  recipients: DirectiveRecipient[]
) {
  return countFunnelStages(recipients, { published: directive.published });
}
