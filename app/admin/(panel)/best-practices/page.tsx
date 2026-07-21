import { redirect } from "next/navigation";
import { BestPracticesAdmin } from "@/components/admin/best-practices-admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { canManageDirectives } from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  pgListBestPractices,
  pgListHighScoreSuggestions,
} from "@/lib/db/repository-best-practices";
import { BEST_PRACTICE_SCORE_SUGGEST_THRESHOLD } from "@/lib/command-feature-labels";
import { pgGetUserPermissionsForCampaign } from "@/lib/db/repository-extended";
import { isPostgresConfigured } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function BestPracticesPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(query.campaign);
  if (!campaignId) redirect("/admin/campaigns");

  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  if (!isFullAdmin(session)) {
    if (!session.userId || !isPostgresConfigured()) redirect("/admin");
    const membership = await pgGetUserPermissionsForCampaign(session.userId, campaignId);
    if (!membership && session.role !== "client") redirect("/admin");
  }

  if (!isPostgresConfigured()) {
    return (
      <div className="rounded-xl border p-6 text-sm text-muted-foreground">
        کتابخانه بهترین اقدامات فقط با پایگاه داده فعال است.
      </div>
    );
  }

  const canManage = canManageDirectives(session);
  const [approved, pending, highScore] = await Promise.all([
    pgListBestPractices(campaignId, "approved"),
    canManage ? pgListBestPractices(campaignId, "pending") : Promise.resolve([]),
    canManage
      ? pgListHighScoreSuggestions(campaignId, BEST_PRACTICE_SCORE_SUGGEST_THRESHOLD)
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">بهترین اقدامات</h1>
        <p className="text-sm text-muted-foreground">
          کارت‌های موفق تأییدشده — فقط مشاهده. پیشنهاد و تأیید با مدیر/کارفرما.
        </p>
      </div>
      <BestPracticesAdmin
        campaignId={campaignId}
        canManage={canManage}
        initialApproved={approved}
        initialPending={pending}
        initialHighScore={highScore}
      />
    </div>
  );
}
