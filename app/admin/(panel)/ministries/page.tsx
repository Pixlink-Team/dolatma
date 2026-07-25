import { redirect } from "next/navigation";
import { DevicesAdmin } from "@/components/admin/devices-admin";
import {
  canAccessDevicesTree,
  getSessionHomeDeviceId,
  isDeviceTreeScopedRole,
  listAccessibleDevices,
} from "@/lib/auth/device-access";
import { canManageSubtreeDevices, canManageSubtreeUsers, isClientUser } from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { pgEnsureDefaultDevices } from "@/lib/db/repository-devices";
import { isOrgUserRole } from "@/lib/user-roles";
import { isPostgresConfigured } from "@/lib/utils";

export default async function MinistriesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const fullAdmin = isFullAdmin(session);
  // Tree management page matches sidebar: needs manageSubtreeDevices for org users.
  if (!canAccessDevicesTree(session)) redirect("/admin");
  const canManageDevices = canManageSubtreeDevices(session);
  const canManageAccess =
    fullAdmin ||
    isClientUser(session) ||
    (isOrgUserRole(session.role) && canManageSubtreeUsers(session));
  let devices: Awaited<ReturnType<typeof listAccessibleDevices>> = [];
  let homeDeviceId: string | null = null;

  if (isPostgresConfigured()) {
    if (fullAdmin) {
      await pgEnsureDefaultDevices();
    }
    devices = await listAccessibleDevices(session);
    if (isDeviceTreeScopedRole(session)) {
      homeDeviceId = await getSessionHomeDeviceId(session);
    }
  }

  return (
    <DevicesAdmin
      initialDevices={devices}
      canCreateRoot={fullAdmin}
      canManageDevices={canManageDevices}
      canManageAccess={canManageAccess}
      showPassport
      homeDeviceId={homeDeviceId}
    />
  );
}
