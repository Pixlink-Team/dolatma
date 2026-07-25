import { notFound, redirect } from "next/navigation";
import { DevicePassportView } from "@/components/admin/device-passport";
import {
  canAccessDevicesPage,
  canEditDevicePassport,
  canViewDevice,
} from "@/lib/auth/device-access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { pgGetDevicePassport } from "@/lib/db/repository-devices";
import { isPostgresConfigured } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DevicePassportPage({ params }: PageProps) {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!canAccessDevicesPage(session)) redirect("/admin");

  const { id } = await params;
  if (!isFullAdmin(session)) {
    const allowed = await canViewDevice(session, id);
    if (!allowed) redirect("/admin/ministries");
  }

  if (!isPostgresConfigured()) notFound();

  let passport: Awaited<ReturnType<typeof pgGetDevicePassport>> = null;
  try {
    passport = await pgGetDevicePassport(id);
  } catch (error) {
    console.error("[device-passport] page load failed", id, error);
    throw error;
  }
  if (!passport) notFound();

  const canEdit = isFullAdmin(session)
    ? true
    : await canEditDevicePassport(session, id);

  return (
    <DevicePassportView
      initialPassport={passport}
      canManageStaff={canEdit}
      canManageAdminSections={canEdit}
    />
  );
}
