import { redirect } from "next/navigation";
import { NationalCalendarAdmin } from "@/components/admin/national-calendar-admin";
import {
  hasAnyCampaignPermission,
  isClientUser,
} from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { getNationalCalendarAction } from "@/lib/actions/calendar-actions";
import { isPostgresConfigured } from "@/lib/utils";

export default async function NationalCalendarPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const allowed =
    isFullAdmin(session) ||
    isClientUser(session) ||
    (await hasAnyCampaignPermission(session, "nationalCalendar"));
  if (!allowed) redirect("/admin");

  if (!isPostgresConfigured()) {
    return (
      <div className="rounded-xl border p-6 text-sm text-muted-foreground">
        تقویم ملی فقط با پایگاه داده فعال است.
      </div>
    );
  }

  // National view: all campaigns + all directives (no campaign filter).
  const result = await getNationalCalendarAction(null);
  if (!result.success) {
    return (
      <div className="rounded-xl border p-6 text-sm text-destructive">
        {result.error ?? "بارگذاری تقویم ناموفق بود"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تقویم ملی</h1>
        <p className="text-sm text-muted-foreground">
          دستورکارها — هشدار تداخل فقط وقتی دستگاه، استان و موضوع هم‌زمان باشند.
        </p>
      </div>
      <NationalCalendarAdmin
        directives={result.directives}
        conflicts={result.conflicts}
      />
    </div>
  );
}
