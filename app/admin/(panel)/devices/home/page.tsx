import { redirect } from "next/navigation";
import {
  canAccessDevicesPage,
  getSessionHomeDeviceId,
} from "@/lib/auth/device-access";
import { getAuthSession } from "@/lib/auth/get-session";

/** Sidebar entry: open the signed-in user's own device passport. */
export default async function HomeDevicePassportPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!canAccessDevicesPage(session)) redirect("/admin");

  const homeDeviceId = await getSessionHomeDeviceId(session);
  if (!homeDeviceId) redirect("/admin/profile");

  redirect(`/admin/devices/${homeDeviceId}`);
}
