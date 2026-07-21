"use client";

import { Badge } from "@/components/ui/badge";
import { formatPersianDate } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  kind: "campaign" | "directive";
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  topic?: string;
  campaignTitle?: string;
  crisisMode?: boolean;
}

interface NationalCalendarAdminProps {
  campaigns: Array<{
    id: string;
    title: string;
    startDate?: string | null;
    endDate?: string | null;
    topics: string[];
  }>;
  directives: Array<{
    id: string;
    title: string;
    campaignTitle: string;
    startDate?: string | null;
    endDate?: string | null;
    topic: string;
    crisisMode: boolean;
  }>;
  conflicts: Array<{
    aId: string;
    aTitle: string;
    aKind: "campaign" | "directive";
    bId: string;
    bTitle: string;
    bKind: "campaign" | "directive";
  }>;
}

export function NationalCalendarAdmin({
  campaigns,
  directives,
  conflicts,
}: NationalCalendarAdminProps) {
  const events: CalendarEvent[] = [
    ...campaigns.map((item) => ({
      id: item.id,
      kind: "campaign" as const,
      title: item.title,
      startDate: item.startDate,
      endDate: item.endDate,
      topic: item.topics[0] ?? "",
    })),
    ...directives.map((item) => ({
      id: item.id,
      kind: "directive" as const,
      title: item.title,
      startDate: item.startDate,
      endDate: item.endDate,
      topic: item.topic,
      campaignTitle: item.campaignTitle,
      crisisMode: item.crisisMode,
    })),
  ].sort((a, b) => String(a.startDate ?? "").localeCompare(String(b.startDate ?? "")));

  return (
    <div className="space-y-6">
      {conflicts.length > 0 ? (
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
          <h2 className="font-semibold text-amber-800 dark:text-amber-200">
            هشدار تداخل (دستگاه + استان + موضوع)
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {conflicts.map((item) => (
              <li key={`${item.aId}-${item.bId}`}>
                «{item.aTitle}» با «{item.bTitle}» هم‌پوشانی دارد
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/40 text-right">
            <tr>
              <th className="p-3 font-medium">نوع</th>
              <th className="p-3 font-medium">عنوان</th>
              <th className="p-3 font-medium">موضوع</th>
              <th className="p-3 font-medium">شروع</th>
              <th className="p-3 font-medium">پایان</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  رویدادی ثبت نشده است.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={`${event.kind}-${event.id}`} className="border-t">
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={event.kind === "campaign" ? "default" : "secondary"}>
                        {event.kind === "campaign" ? "اقدام" : "دستورکار"}
                      </Badge>
                      {event.crisisMode ? (
                        <Badge variant="destructive">بحران</Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3">
                    <p>{event.title}</p>
                    {event.campaignTitle ? (
                      <p className="text-xs text-muted-foreground">{event.campaignTitle}</p>
                    ) : null}
                  </td>
                  <td className="p-3">{event.topic || "—"}</td>
                  <td className="p-3">
                    {event.startDate ? formatPersianDate(event.startDate) : "—"}
                  </td>
                  <td className="p-3">
                    {event.endDate ? formatPersianDate(event.endDate) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
