"use client";

import Image from "next/image";
import { KPICard } from "@/components/public/kpi-card";
import { SectionHeader } from "@/components/public/section-header";
import { ParticipationChart } from "@/components/charts/participation-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CampaignSubmission, SubmissionSummary } from "@/lib/types";
import { formatPersianDate, getStatusLabel } from "@/lib/utils";
import { CheckCircle, Clock, FileText, Users, XCircle } from "lucide-react";

interface SubmissionsSectionProps {
  submissions: CampaignSubmission[];
  summary: SubmissionSummary;
}

export function SubmissionsSection({ submissions, summary }: SubmissionsSectionProps) {
  return (
    <section id="submissions">
      <SectionHeader
        title="مشارکت کاربران"
        description="مشارکت‌کنندگان و ارسال‌های تأییدشده در کمپین"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <KPICard title="شرکت‌کنندگان" value={summary.totalParticipants} icon={Users} />
        <KPICard title="کل ارسال‌ها" value={summary.totalSubmissions} icon={FileText} />
        <KPICard title="تأیید شده" value={summary.approvedSubmissions} icon={CheckCircle} />
        <KPICard title="در انتظار" value={summary.pendingSubmissions} icon={Clock} />
        <KPICard title="رد شده" value={summary.rejectedSubmissions} icon={XCircle} />
      </div>

      <div className="mb-6">
        <ParticipationChart data={summary.participationByDate} />
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card">
          ارسال تأییدشده‌ای وجود ندارد.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {submissions.map((sub) => (
            <Card key={sub.id} className="overflow-hidden">
              {sub.mediaUrl && (
                <div className="relative aspect-video bg-muted">
                  <Image
                    src={sub.mediaUrl}
                    alt={sub.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              )}
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm">{sub.title}</h3>
                  <Badge status={sub.status}>{getStatusLabel(sub.status)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{sub.submissionType}</p>
                <p className="text-sm line-clamp-3">{sub.text}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>{sub.participantName === "ناشناس" ? "کاربر ناشناس" : sub.participantName}</span>
                  <span>{formatPersianDate(sub.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
