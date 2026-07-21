import { redirect } from "next/navigation";
import { NationalCalendarAdmin } from "@/components/admin/national-calendar-admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { getAuthSession } from "@/lib/auth/get-session";
import { getNationalCalendarAction } from "@/lib/actions/calendar-actions";
import { isPostgresConfigured } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function NationalCalendarPage({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const query = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(query.campaign);

  if (!isPostgresConfigured()) {
    return (
      <div className="rounded-xl border p-6 text-sm text-muted-foreground">
        تقویم ملی فقط با پایگاه داده فعال است.
      </div>
    );
  }

  const result = await getNationalCalendarAction(campaignId);
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
          اقدامات و دستورکارها — هشدار تداخل فقط وقتی دستگاه، استان و موضوع هم‌زمان باشند.
        </p>
      </div>
      <NationalCalendarAdmin
        campaigns={result.campaigns}
        directives={result.directives}
        conflicts={result.conflicts}
      />
    </div>
  );
}
