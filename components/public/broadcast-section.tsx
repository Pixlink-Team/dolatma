import type { BroadcastReport, DataOwnerGroup } from "@/lib/types";
import { formatPersianDate, formatPersianNumber } from "@/lib/utils";
import { OwnerGroupedSection } from "@/components/public/owner-grouped-section";
import { SectionHeader } from "@/components/public/section-header";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

interface BroadcastSectionProps {
  reports: BroadcastReport[];
  groups: DataOwnerGroup<BroadcastReport>[];
}

export function BroadcastSection({ reports, groups }: BroadcastSectionProps) {
  if (reports.length === 0) return null;

  return (
    <section id="broadcast-reports">
      <SectionHeader
        title="گزارش پخش صدا و سیما"
        description="گزارش‌های PDF روزانه و خلاصه آمار قابل اندازه‌گیری"
      />

      <OwnerGroupedSection groups={groups}>
        {(groupReports) => (
          <div className="space-y-4">
            {groupReports.map((report) => (
              <article key={report.id} className="rounded-xl border bg-card p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">{report.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatPersianDate(report.reportDate)}</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {report.summaryData.totalBillboards != null && (
                      <span>بیلبورد: {formatPersianNumber(report.summaryData.totalBillboards)}</span>
                    )}
                    {report.summaryData.totalCities != null && (
                      <span>شهر: {formatPersianNumber(report.summaryData.totalCities)}</span>
                    )}
                  </div>
                  {report.summaryData.notes && (
                    <p className="text-sm text-muted-foreground">{report.summaryData.notes}</p>
                  )}
                </div>
                <Button variant="outline" asChild>
                  <a href={report.pdfUrl} target="_blank" rel="noreferrer" download={report.fileName}>
                    <Download className="h-4 w-4" />
                    دانلود PDF
                  </a>
                </Button>
              </article>
            ))}
          </div>
        )}
      </OwnerGroupedSection>
    </section>
  );
}
