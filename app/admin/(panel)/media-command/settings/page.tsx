import { loadMediaCommandContext } from "@/lib/media-command/load-context";
import { MediaSettingsAdmin } from "@/components/admin/media-command/media-settings-admin";
import { ORG_ROLE_LABELS } from "@/lib/org-roles";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "مدیر سامانه",
  client: "کارفرما / مدیر کمپین",
  org_user: "کاربر دستگاه",
  ministry_parent: "مدیر",
  contributor: "کاربر دستگاه",
  sub_user: "کاربر دستگاه",
};

export default async function MediaSettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId, session, isFullAdmin } = await loadMediaCommandContext(params.campaign);
  const roleKey = isFullAdmin ? "admin" : session.role ?? "org_user";
  const orgLabel =
    session.orgRole && ORG_ROLE_LABELS[session.orgRole as keyof typeof ORG_ROLE_LABELS]
      ? ORG_ROLE_LABELS[session.orgRole as keyof typeof ORG_ROLE_LABELS]
      : null;
  return (
    <MediaSettingsAdmin
      campaignId={campaignId}
      roleLabel={orgLabel ?? ROLE_LABELS[roleKey] ?? "کاربر پنل"}
    />
  );
}
