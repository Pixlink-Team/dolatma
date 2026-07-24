import { redirect } from "next/navigation";
import { DevicesAdmin } from "@/components/admin/devices-admin";
import {
  canAccessDevicesPage,
  getSessionHomeDeviceId,
  isDeviceTreeScopedRole,
  listAccessibleDevices,
} from "@/lib/auth/device-access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { pgEnsureDefaultDevices } from "@/lib/db/repository-devices";
import { isPostgresConfigured } from "@/lib/utils";

export default async function MinistriesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!canAccessDevicesPage(session)) redirect("/admin");

  const fullAdmin = isFullAdmin(session);
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
      showPassport
      homeDeviceId={homeDeviceId}
    />
  );
}
