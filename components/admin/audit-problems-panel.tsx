"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquareReply,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProblemReportStatusAction, replyToProblemReportAction } from "@/lib/actions/problem-report-actions";
import {
  PROBLEM_REPORT_CATEGORY_LABELS,
  PROBLEM_REPORT_STATUS_LABELS,
  type ProblemReport,
  type ProblemReportStats,
  type ProblemReportStatus,
} from "@/lib/audit/problem-types";
import { getAuditRoleLabel } from "@/lib/audit/labels";
import {
  formatPersianDateTime,
  formatPersianMinutesDuration,
  formatPersianNumber,
} from "@/lib/utils";

const STATUS_BADGE: Record<
  ProblemReportStatus,
  "warning" | "default" | "success" | "outline"
> = {
  pending: "warning",
  in_progress: "default",
  resolved: "success",
  dismissed: "outline",
};

type StatusFilter = ProblemReportStatus | "open" | "answered" | "all";

function resolveName(name?: string | null, email?: string | null) {
  return name?.trim() || email?.trim() || "ناشناس";
}

function StatChip({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: typeof Ticket;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="rounded-md bg-muted p-2 shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold tabular-nums">{value}</p>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function AuditProblemsPanel({
  reports,
  stats,
}: {
  reports: ProblemReport[];
  stats: ProblemReportStats;
}) {
  // Default: show everything so answered tickets stay visible alongside open ones.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredReports = useMemo(() => {
    if (statusFilter === "all") return reports;
    if (statusFilter === "open") {
      return reports.filter((r) => r.status === "pending" || r.status === "in_progress");
    }
    if (statusFilter === "answered") {
      return reports.filter((r) => Boolean(r.adminNote?.trim()));
    }
    return reports.filter((r) => r.status === statusFilter);
  }, [reports, statusFilter]);

  const handleStatus = async (id: string, status: ProblemReportStatus) => {
    setBusyId(id);
    try {
      const result = await updateProblemReportStatusAction({
        id,
        status,
        adminNote: notes[id],
      });
      if (!result.success) {
        toast.error(result.error ?? "به‌روزرسانی ناموفق بود");
        return;
      }
      toast.success("وضعیت گزارش به‌روز شد");
    } catch (error) {
      console.error("handleStatus failed:", error);
      toast.error("خطا در به‌روزرسانی گزارش");
    } finally {
      setBusyId(null);
    }
  };

  const handleReply = async (id: string, fallbackNote?: string) => {
    const note = (notes[id] ?? fallbackNote ?? "").trim();
    if (note.length < 2) {
      toast.error("متن پاسخ را بنویسید");
      return;
    }
    setBusyId(id);
    try {
      const result = await replyToProblemReportAction({ id, adminNote: note });
      if (!result.success) {
        toast.error(result.error ?? "ارسال پاسخ ناموفق بود");
        return;
      }
      toast.success("پاسخ برای کاربر ارسال شد");
    } catch (error) {
      console.error("handleReply failed:", error);
      toast.error("خطا در ارسال پاسخ");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatChip
          label="کل تیکت‌ها"
          value={formatPersianNumber(stats.total)}
          icon={Ticket}
        />
        <StatChip
          label="باز"
          value={formatPersianNumber(stats.open)}
          icon={AlertTriangle}
          hint={`${formatPersianNumber(stats.pending)} در انتظار · ${formatPersianNumber(stats.inProgress)} در حال بررسی`}
        />
        <StatChip
          label="پاسخ‌داده‌شده"
          value={formatPersianNumber(stats.answered)}
          icon={MessageSquareReply}
          hint={`${formatPersianNumber(stats.resolved)} حل‌شده · ${formatPersianNumber(stats.dismissed)} بسته‌شده`}
        />
        <StatChip
          label="میانگین پاسخ"
          value={formatPersianMinutesDuration(stats.avgReplyMinutes)}
          icon={Clock3}
          hint="از ثبت تیکت تا اولین پاسخ ادمین"
        />
      </div>

      <Card>
        <CardHeader className="pb-2 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              مشکلات ثبت‌شده
              <Badge variant="warning">
                {formatPersianNumber(stats.open)} باز
              </Badge>
              {stats.answered > 0 && (
                <Badge variant="outline">
                  {formatPersianNumber(stats.answered)} پاسخ‌داده‌شده
                </Badge>
              )}
            </CardTitle>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="open">بازها</SelectItem>
                <SelectItem value="answered">پاسخ‌داده‌شده‌ها</SelectItem>
                <SelectItem value="pending">در انتظار</SelectItem>
                <SelectItem value="in_progress">در حال بررسی</SelectItem>
                <SelectItem value="resolved">حل شده</SelectItem>
                <SelectItem value="dismissed">بسته شده</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredReports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              گزارشی در این فیلتر نیست.
            </p>
          ) : (
            filteredReports.map((report) => (
              <div key={report.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={STATUS_BADGE[report.status]}>
                        {PROBLEM_REPORT_STATUS_LABELS[report.status]}
                      </Badge>
                      <Badge variant="outline">
                        {PROBLEM_REPORT_CATEGORY_LABELS[report.category]}
                      </Badge>
                      {report.adminNote?.trim() && (
                        <Badge variant="success">پاسخ ادمین دارد</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-base">{report.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {resolveName(report.reporterName, report.reporterEmail)}
                      {report.reporterRole
                        ? ` · ${getAuditRoleLabel(report.reporterRole)}`
                        : ""}
                      {" · "}
                      {formatPersianDateTime(report.createdAt)}
                      {report.repliedAt && (
                        <>
                          {" · پاسخ: "}
                          {formatPersianDateTime(report.repliedAt)}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <p className="text-sm whitespace-pre-wrap">{report.description}</p>

                {report.path && (
                  <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                    صفحه: {report.path}
                  </p>
                )}

                {report.adminNote && (
                  <div className="rounded-md bg-primary/5 border border-primary/10 px-3 py-2 text-sm">
                    <span className="font-medium">پاسخ به کاربر: </span>
                    {report.adminNote}
                  </div>
                )}

                <div className="space-y-2">
                  <Textarea
                    placeholder="پاسخ به کاربر (برای گزارش‌دهنده قابل مشاهده است)…"
                    value={notes[report.id] ?? report.adminNote ?? ""}
                    onChange={(event) =>
                      setNotes((prev) => ({ ...prev, [report.id]: event.target.value }))
                    }
                    className="min-h-[70px]"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busyId === report.id}
                      onClick={() => handleReply(report.id, report.adminNote ?? "")}
                      data-audit-label="ارسال پاسخ گزارش مشکل"
                    >
                      {busyId === report.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      ارسال پاسخ
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === report.id || report.status === "in_progress"}
                      onClick={() => handleStatus(report.id, "in_progress")}
                      data-audit-label="شروع بررسی گزارش مشکل"
                    >
                      {busyId === report.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      شروع بررسی
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === report.id}
                      onClick={() => handleStatus(report.id, "resolved")}
                      data-audit-label="حل گزارش مشکل"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      حل شد
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busyId === report.id}
                      onClick={() => handleStatus(report.id, "dismissed")}
                      data-audit-label="بستن گزارش مشکل"
                    >
                      بستن بدون اقدام
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
