"use client";

import { useEffect } from "react";
import { DirectiveBlockersPanel } from "@/components/admin/directive-blockers-panel";
import { DirectiveFunnelPanel } from "@/components/admin/directive-funnel-panel";
import { markDirectiveSeenAction } from "@/lib/actions/directive-actions";
import type { CampaignDirective, DirectiveBlocker, DirectiveRecipient } from "@/lib/types";

interface DirectiveOpsPanelsProps {
  directive: CampaignDirective;
  recipients: DirectiveRecipient[];
  blockers: DirectiveBlocker[];
  canManage: boolean;
  currentUserId?: string | null;
}

export function DirectiveOpsPanels({
  directive,
  recipients,
  blockers,
  canManage,
  currentUserId,
}: DirectiveOpsPanelsProps) {
  useEffect(() => {
    if (!currentUserId || canManage) return;
    const mine = recipients.find((r) => r.userId === currentUserId);
    if (mine && !mine.seenAt) {
      void markDirectiveSeenAction(directive.id, directive.campaignId);
    }
  }, [canManage, currentUserId, directive.campaignId, directive.id, recipients]);

  return (
    <div className="space-y-4">
      {directive.crisisMode ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-semibold text-destructive">حالت بحران فعال است</p>
          <p className="mt-1 text-muted-foreground">
            ابلاغ فوری انجام شده؛ تأیید دریافت الزامی است. در صورت عدم تأیید، پس از{" "}
            {directive.escalationAfterMinutes ?? 30} دقیقه به تماس جایگزین تصاعد می‌شود.
          </p>
        </div>
      ) : null}

      <DirectiveFunnelPanel
        directive={directive}
        recipients={recipients}
        canManage={canManage}
        currentUserId={currentUserId}
      />

      <DirectiveBlockersPanel
        directiveId={directive.id}
        campaignId={directive.campaignId}
        blockers={blockers}
        canRegister={!canManage}
      />
    </div>
  );
}
