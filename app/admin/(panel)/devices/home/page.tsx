import { redirect } from "next/navigation";
import {
  canAccessDevicesPage,
  getSessionHomeDeviceId,
} from "@/lib/auth/device-access";
import { getAuthSession } from "@/lib/auth/get-session";
import { adminHref } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

/** Sidebar entry: open the signed-in user's own device passport. */
export default async function HomeDevicePassportPage({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!canAccessDevicesPage(session)) redirect("/admin");

  const homeDeviceId = await getSessionHomeDeviceId(session);
  if (!homeDeviceId) redirect("/admin/profile");

  const { campaign } = await searchParams;
  redirect(adminHref(`/admin/devices/${homeDeviceId}`, campaign));
}
