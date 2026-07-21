import { redirect } from "next/navigation";
import { DevicesAdmin } from "@/components/admin/devices-admin";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  pgEnsureDefaultDevices,
  pgListDevices,
} from "@/lib/db/repository-devices";
import { isPostgresConfigured } from "@/lib/utils";

export default async function MinistriesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!isFullAdmin(session)) redirect("/admin");

  let devices: Awaited<ReturnType<typeof pgListDevices>> = [];
  if (isPostgresConfigured()) {
    await pgEnsureDefaultDevices();
    devices = await pgListDevices();
  }

  return <DevicesAdmin initialDevices={devices} />;
}
