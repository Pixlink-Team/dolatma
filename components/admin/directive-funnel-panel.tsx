"use client";

import { useMemo, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DIRECTIVE_FUNNEL_STAGE_LABELS,
  DIRECTIVE_FUNNEL_STAGES,
} from "@/lib/command-feature-labels";
import {
  markDirectiveExecutedAction,
  processCrisisEscalationAction,
  verifyDirectiveExecutionAction,
} from "@/lib/actions/directive-actions";
import { resolveRecipientFunnelStage, summarizeDirectiveFunnel } from "@/lib/directive-funnel";
import type { CampaignDirective, DirectiveRecipient } from "@/lib/types";
import { cn, formatPersianNumber } from "@/lib/utils";

interface DirectiveFunnelPanelProps {
  directive: CampaignDirective;
  recipients: DirectiveRecipient[];
  canManage: boolean;
  currentUserId?: string | null;
}

export function DirectiveFunnelPanel({
  directive,
  recipients,
  canManage,
  currentUserId,
}: DirectiveFunnelPanelProps) {
  const [isPending, startTransition] = useTransition();
  const counts = useMemo(
    () => summarizeDirectiveFunnel(directive, recipients),
    [directive, recipients]
  );

  const myRecipient = recipients.find((r) => r.userId === currentUserId);
  const myStage = myRecipient
    ? resolveRecipientFunnelStage(myRecipient, { published: directive.published })
    : null;

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">قیف اجرای دستور</h2>
          <p className="text-xs text-muted-foreground">
            از ارسال تا تأیید نهایی برای هر مخاطب
          </p>
        </div>
        {directive.crisisMode ? (
          <Badge variant="destructive">حالت بحران</Badge>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {DIRECTIVE_FUNNEL_STAGES.map((stage) => (
          <div
            key={stage}
            className={cn(
              "rounded-lg border p-2 text-center",
              myStage === stage && "border-primary bg-primary/5"
            )}
          >
            <p className="text-[11px] text-muted-foreground">
              {DIRECTIVE_FUNNEL_STAGE_LABELS[stage]}
            </p>
            <p className="text-lg font-bold">{formatPersianNumber(counts[stage])}</p>
          </div>
        ))}
      </div>

      {!canManage && myRecipient ? (
        <div className="flex flex-wrap gap-2">
          {!myRecipient.executedAt ? (
            <Button
              size="sm"
              disabled={isPending || !myRecipient.hasActionPlan}
              onClick={() => {
                startTransition(async () => {
                  const result = await markDirectiveExecutedAction(
                    directive.id,
                    directive.campaignId
                  );
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("اجرا ثبت شد");
                });
              }}
            >
              علامت‌گذاری اجراشده
            </Button>
          ) : (
            <Badge variant="secondary">اجرا ثبت شده است</Badge>
          )}
        </div>
      ) : null}

      {canManage ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-right">
              <tr>
                <th className="p-2 font-medium">مخاطب</th>
                <th className="p-2 font-medium">مرحله</th>
                <th className="p-2 font-medium">تماس جایگزین</th>
                <th className="p-2 font-medium">اقدام</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((recipient) => {
                const stage = resolveRecipientFunnelStage(recipient, {
                  published: directive.published,
                });
                return (
                  <tr key={recipient.userId} className="border-t">
                    <td className="p-2">{recipient.userName}</td>
                    <td className="p-2">{DIRECTIVE_FUNNEL_STAGE_LABELS[stage]}</td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {recipient.alternateContactName || "—"}
                      {recipient.alternateContactPhone
                        ? ` · ${recipient.alternateContactPhone}`
                        : ""}
                    </td>
                    <td className="p-2">
                      {recipient.executedAt && !recipient.executionVerifiedAt ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(async () => {
                              const result = await verifyDirectiveExecutionAction(
                                directive.id,
                                directive.campaignId,
                                recipient.userId
                              );
                              if (!result.success) {
                                toast.error(result.error);
                                return;
                              }
                              toast.success("اجرا تأیید شد");
                            });
                          }}
                        >
                          تأیید اجرا
                        </Button>
                      ) : recipient.executionVerifiedAt ? (
                        <Badge variant="secondary">تأییدشده</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {canManage && directive.crisisMode ? (
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending || Boolean(directive.escalatedAt)}
          onClick={() => {
            startTransition(async () => {
              const result = await processCrisisEscalationAction(
                directive.id,
                directive.campaignId
              );
              if (!result.success) {
                toast.error(result.error);
                return;
              }
              toast.success(
                result.sent > 0
                  ? `تصاعد انجام شد (${formatPersianNumber(result.sent)} پیامک)`
                  : "مخاطب معوقی برای تصاعد نبود یا قبلاً انجام شده"
              );
            });
          }}
        >
          {directive.escalatedAt ? "تصاعد انجام شده" : "اجرای تصاعد هشدار"}
        </Button>
      ) : null}
    </section>
  );
}
