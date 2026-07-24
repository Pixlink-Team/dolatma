"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPersianNumber } from "@/lib/utils";
import { ARCHIVE_TYPE_LABELS, SENTIMENT_LABELS } from "@/lib/monitoring/labels";
import type { ArchiveType, MonitoringArchive, MonitoringOrganization } from "@/lib/monitoring/types";
import {
  ensureMonitoringReadyAction,
  getMonitoringLookupsAction,
  listArchivesAction,
} from "@/lib/actions/monitoring-actions";
import { MonitoringEmptyState } from "@/components/admin/monitoring/monitoring-ui";

const ARCHIVE_TABS: Array<{ id: ArchiveType | "all"; label: string }> = [
  { id: "all", label: "همه" },
  { id: "negative_news", label: ARCHIVE_TYPE_LABELS.negative_news },
  { id: "trend", label: ARCHIVE_TYPE_LABELS.trend },
  { id: "rapid_response_case", label: ARCHIVE_TYPE_LABELS.rapid_response_case },
  { id: "lesson", label: ARCHIVE_TYPE_LABELS.lesson },
  { id: "source_profile", label: ARCHIVE_TYPE_LABELS.source_profile },
];

export function MonitoringArchiveAdmin({ campaignId }: { campaignId: string }) {
  const [archives, setArchives] = useState<MonitoringArchive[]>([]);
  const [organizations, setOrganizations] = useState<MonitoringOrganization[]>([]);
  const [tab, setTab] = useState<ArchiveType | "all">("all");
  const [organizationId, setOrganizationId] = useState("all");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      await ensureMonitoringReadyAction(campaignId);
      const lookups = await getMonitoringLookupsAction();
      if (lookups.success) setOrganizations(lookups.organizations);
      const result = await listArchivesAction({
        organizationId: organizationId === "all" ? undefined : organizationId,
        archiveType: tab === "all" ? undefined : tab,
        search: search.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setArchives(result.archives);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, tab, organizationId]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">بانک خبر و تحلیل</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            آرشیو اخبار منفی، پرونده‌ها، درس‌آموخته‌ها و پروفایل منابع
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={pending}>
          به‌روزرسانی
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ARCHIVE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1 xl:col-span-2">
          <Label>جستجو</Label>
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="موضوع، تگ یا نتیجه..."
            />
            <Button variant="outline" onClick={load} disabled={pending}>
              اعمال
            </Button>
          </div>
        </div>
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
      </div>

      {pending && archives.length === 0 ? (
        <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
      ) : archives.length === 0 ? (
        <MonitoringEmptyState
          title="آرشیوی یافت نشد"
          description="با فیلترهای فعلی موردی در بانک خبر نیست."
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{formatPersianNumber(archives.length)} مورد</p>
          {archives.map((row) => (
            <div key={row.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{row.topic}</h2>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs">
                  {ARCHIVE_TYPE_LABELS[row.archiveType]}
                </span>
              </div>
              {row.subTopic ? (
                <p className="text-sm text-muted-foreground">{row.subTopic}</p>
              ) : null}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{row.organizationName ?? "سازمان"}</span>
                {row.finalSentiment ? (
                  <span>{SENTIMENT_LABELS[row.finalSentiment]}</span>
                ) : null}
                {row.finalRiskScore != null ? (
                  <span>امتیاز: {formatPersianNumber(row.finalRiskScore)}</span>
                ) : null}
                <span>
                  آرشیو:{" "}
                  {new Date(row.archivedAt).toLocaleString("fa-IR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              {row.finalResult ? <p className="text-sm">{row.finalResult}</p> : null}
              {row.lessonsLearned ? (
                <p className="text-sm text-muted-foreground">
                  درس‌آموخته: {row.lessonsLearned}
                </p>
              ) : null}
              {row.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {row.tags.map((tag) => (
                    <span key={tag} className="rounded-md border px-2 py-0.5 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
