import { loadMediaCommandContext } from "@/lib/media-command/load-context";
import { MediaSettingsAdmin } from "@/components/admin/media-command/media-settings-admin";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "مدیر سامانه",
  client: "کارفرما / مدیر کمپین",
  ministry_parent: "یوزر مادر وزارتخانه",
  contributor: "کاربر روابط عمومی",
  sub_user: "کاربر زیرمجموعه",
};

export default async function MediaSettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId, session, isFullAdmin } = await loadMediaCommandContext(params.campaign);
  const roleKey = isFullAdmin ? "admin" : session.role ?? "contributor";
  return (
    <MediaSettingsAdmin
      campaignId={campaignId}
      roleLabel={ROLE_LABELS[roleKey] ?? "کاربر پنل"}
    />
  );
}
