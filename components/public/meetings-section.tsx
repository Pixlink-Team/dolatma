import type { DataOwnerGroup, MeetingWithTasks } from "@/lib/types";
import { cn, formatPersianDate } from "@/lib/utils";
import { OwnerGroupedSection } from "@/components/public/owner-grouped-section";
import { SectionHeader } from "@/components/public/section-header";
import { CalendarDays, MapPin } from "lucide-react";
import Image from "next/image";

interface MeetingsSectionProps {
  meetings: MeetingWithTasks[];
  groups: DataOwnerGroup<MeetingWithTasks>[];
}

function MeetingCard({ meeting }: { meeting: MeetingWithTasks }) {
  const completedCount = meeting.tasks.filter((task) => task.completed).length;
  const totalCount = meeting.tasks.length;

  return (
    <article className="rounded-xl border bg-card overflow-hidden">
      {meeting.imageUrl && (
        <div className="relative aspect-video w-full bg-muted">
          <Image
            src={meeting.imageUrl}
            alt={`جلسه ${formatPersianDate(meeting.meetingDate)}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      )}

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {formatPersianDate(meeting.meetingDate)}
          </span>
          {meeting.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {meeting.location}
            </span>
          )}
        </div>

        {meeting.discussionSummary && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{meeting.discussionSummary}</p>
        )}

        {totalCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium">مصوبات</h4>
              <span className="text-xs text-muted-foreground">
                {completedCount}/{totalCount} انجام‌شده
              </span>
            </div>
            <ul className="space-y-2 rounded-lg border bg-muted/20 p-3">
              {meeting.tasks.map((task) => (
                <li key={task.id} className="flex items-start gap-2 text-sm">
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                      task.completed
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 bg-background"
                    )}
                    aria-hidden
                  >
                    {task.completed ? "✓" : ""}
                  </span>
                  <span className={cn(task.completed && "line-through text-muted-foreground")}>
                    {task.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

export function MeetingsSection({ meetings, groups }: MeetingsSectionProps) {
  if (meetings.length === 0) return null;

  return (
    <section id="meetings">
      <SectionHeader
        title="جلسات و مصوبات"
        description="خلاصه جلسات و پیگیری مصوبات"
      />

      <OwnerGroupedSection groups={groups}>
        {(groupMeetings) => (
          <div className="grid gap-4 md:grid-cols-2">
            {groupMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        )}
      </OwnerGroupedSection>
    </section>
  );
}
