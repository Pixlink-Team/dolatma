import { redirect } from "next/navigation";
import { DevicesAdmin } from "@/components/admin/devices-admin";
import {
  canAccessDevicesPage,
  getSessionHomeDeviceId,
  isDeviceTreeScopedRole,
  listAccessibleDevices,
} from "@/lib/auth/device-access";
import { canManageSubtreeDevices } from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { pgEnsureDefaultDevices } from "@/lib/db/repository-devices";
import { isPostgresConfigured } from "@/lib/utils";

export default async function MinistriesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const fullAdmin = isFullAdmin(session);
  // View stays open for the caller's device subtree; manage is a separate flag.
  if (!canAccessDevicesPage(session)) redirect("/admin");
  const canManageDevices = canManageSubtreeDevices(session);
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
      showPassport
      homeDeviceId={homeDeviceId}
    />
  );
}
