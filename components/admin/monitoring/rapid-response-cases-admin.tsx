"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminHref, cn, formatPersianNumber } from "@/lib/utils";
import {
  CASE_STATUS_COLORS,
  CASE_STATUS_LABELS,
  RESPONSE_TYPE_LABELS,
  URGENCY_LABELS,
} from "@/lib/monitoring/labels";
import type { MonitoringOrganization, RapidResponseCase } from "@/lib/monitoring/types";
import {
  ensureMonitoringReadyAction,
  getMonitoringLookupsAction,
  listRapidResponseCasesAction,
} from "@/lib/actions/monitoring-actions";
import {
  MonitoringEmptyState,
  RiskBadge,
  UrgencyBadge,
} from "@/components/admin/monitoring/monitoring-ui";
import { useMonitoringPaths } from "@/components/admin/monitoring/monitoring-paths";

export function RapidResponseCasesAdmin({ campaignId }: { campaignId: string }) {
  const paths = useMonitoringPaths();
  const [cases, setCases] = useState<RapidResponseCase[]>([]);
  const [organizations, setOrganizations] = useState<MonitoringOrganization[]>([]);
  const [organizationId, setOrganizationId] = useState("all");
  const [status, setStatus] = useState("all");
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      await ensureMonitoringReadyAction(campaignId);
      const lookups = await getMonitoringLookupsAction();
      if (lookups.success) setOrganizations(lookups.organizations);
      const result = await listRapidResponseCasesAction({
        campaignId,
        organizationId: organizationId === "all" ? undefined : organizationId,
        status: status === "all" ? undefined : status,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCases(result.cases);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, organizationId, status]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">پرونده‌های واکنش سریع</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            پیگیری وضعیت، مهلت و مسئولان پرونده‌های فعال
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={pending}>
          به‌روزرسانی
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1">
          <Label>سازمان</Label>
          <Select value={organizationId} onValueChange={setOrganizationId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.shortName || org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>وضعیت</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {pending && cases.length === 0 ? (
        <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
      ) : cases.length === 0 ? (
        <MonitoringEmptyState
          title="پرونده‌ای یافت نشد"
          description="با فیلترهای فعلی پرونده‌ای وجود ندارد."
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{formatPersianNumber(cases.length)} پرونده</p>
          {cases.map((c) => (
            <div key={c.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      {c.caseNumber}
                    </span>
                    <h2 className="font-semibold">{c.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                        CASE_STATUS_COLORS[c.caseStatus]
                      )}
                    >
                      {CASE_STATUS_LABELS[c.caseStatus]}
                    </span>
                    <RiskBadge level={c.riskLevel} />
                    <UrgencyBadge level={c.urgencyLevel} />
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{c.organizationName ?? "سازمان نامشخص"}</span>
                    <span>{RESPONSE_TYPE_LABELS[c.responseType]}</span>
                    <span>{URGENCY_LABELS[c.urgencyLevel]}</span>
                    {c.deadline ? (
                      <span>
                        مهلت:{" "}
                        {new Date(c.deadline).toLocaleString("fa-IR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    ) : null}
                    {c.effectivenessScore != null ? (
                      <span>اثربخشی: {formatPersianNumber(c.effectivenessScore)}</span>
                    ) : null}
                  </div>
                </div>
                <Button asChild size="sm">
                  <Link href={adminHref(paths.caseDetail(c.id), campaignId)}>
                    جزئیات
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
