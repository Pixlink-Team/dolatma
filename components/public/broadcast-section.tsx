import type { BroadcastReport, BroadcastReportSummary, DataOwnerGroup } from "@/lib/types";
import { formatPersianDate, formatPersianNumber } from "@/lib/utils";
import { OwnerGroupedSection } from "@/components/public/owner-grouped-section";
import { SectionHeader } from "@/components/public/section-header";
import { KPICard } from "@/components/public/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Download, FileText, MapPin, PanelsTopLeft } from "lucide-react";

interface BroadcastSectionProps {
  reports: BroadcastReport[];
  groups: DataOwnerGroup<BroadcastReport>[];
}

function hasParsedData(summary: BroadcastReportSummary): boolean {
  return (
    summary.totalBillboards != null ||
    (summary.statusBreakdown?.length ?? 0) > 0 ||
    (summary.cityBreakdown?.length ?? 0) > 0
  );
}

function BroadcastReportCard({ report }: { report: BroadcastReport }) {
  const { summaryData } = report;
  const parsed = hasParsedData(summaryData);

  return (
    <article className="rounded-xl border bg-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b p-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">{report.title}</h3>
            {summaryData.clientName && <Badge variant="secondary">{summaryData.clientName}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatPersianDate(report.reportDate)}
            {summaryData.reportDateTime ? ` · ${summaryData.reportDateTime}` : ""}
          </p>
          {summaryData.notes && (
            <p className="text-sm text-muted-foreground">{summaryData.notes}</p>
          )}
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <a href={report.pdfUrl} target="_blank" rel="noreferrer" download={report.fileName}>
            <Download className="h-4 w-4" />
            دانلود PDF
          </a>
        </Button>
      </div>

      {parsed ? (
        <div className="space-y-6 p-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {summaryData.totalBillboards != null && (
              <KPICard title="کل پوستر" value={summaryData.totalBillboards} icon={PanelsTopLeft} />
            )}
            {summaryData.totalCities != null && (
              <KPICard title="تعداد شهر" value={summaryData.totalCities} icon={MapPin} />
            )}
            {summaryData.temporaryCount != null && (
              <KPICard title="پوستر موقت" value={summaryData.temporaryCount} icon={Building2} />
            )}
          </div>

          {summaryData.statusBreakdown && summaryData.statusBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">وضعیت پوسترها</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0 pb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground">
                      <th className="px-4 py-2 text-right font-medium">وضعیت</th>
                      <th className="px-4 py-2 text-left font-medium">تعداد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.statusBreakdown.map((row) => (
                      <tr key={`${row.label}-${row.count}`} className="border-b last:border-0">
                        <td className="px-4 py-2">{row.label}</td>
                        <td className="px-4 py-2 text-left font-medium">
                          {formatPersianNumber(row.count)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {summaryData.cityBreakdown && summaryData.cityBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">زیباسازی بر اساس شهر</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0 pb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground">
                      <th className="px-4 py-2 text-right font-medium">شهر / منطقه</th>
                      <th className="px-4 py-2 text-left font-medium">تعداد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.cityBreakdown.map((row, index) => (
                      <tr key={`${row.name}-${index}`} className="border-b last:border-0">
                        <td className="px-4 py-2 font-mono text-xs" dir="auto">
                          {row.name}
                        </td>
                        <td className="px-4 py-2 text-left font-medium">
                          {formatPersianNumber(row.count)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {summaryData.billboards && summaryData.billboards.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  لیست پوسترها ({formatPersianNumber(summaryData.billboards.length)})
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0 pb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground">
                      <th className="px-4 py-2 text-right font-medium">#</th>
                      <th className="px-4 py-2 text-right font-medium">موقعیت</th>
                      <th className="px-4 py-2 text-right font-medium">کیفیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.billboards.map((row, index) => (
                      <tr key={`${row.location}-${index}`} className="border-b last:border-0">
                        <td className="px-4 py-2 text-muted-foreground">
                          {formatPersianNumber(index + 1)}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs" dir="auto">
                          {row.location}
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant="outline">{row.quality}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="p-4 text-sm text-muted-foreground">
          داده‌ای از PDF استخراج نشده است. فایل را از دکمه بالا دانلود کنید.
        </div>
      )}
    </article>
  );
}

export function BroadcastSection({ reports, groups }: BroadcastSectionProps) {
  if (reports.length === 0) return null;

  return (
    <section id="broadcast-reports">
      <SectionHeader
        title="گزارش پخش صدا و سیما"
        description="گزارش‌های PDF روزانه با آمار استخراج‌شده از فایل"
      />

      <OwnerGroupedSection groups={groups}>
        {(groupReports) => (
          <div className="space-y-6">
            {groupReports.map((report) => (
              <BroadcastReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </OwnerGroupedSection>
    </section>
  );
}
