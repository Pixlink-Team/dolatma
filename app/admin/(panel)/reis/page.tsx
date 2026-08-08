import { ReisHub } from "@/components/admin/reis/reis-hub";
import { getAuthSession } from "@/lib/auth/get-session";

export default async function ReisHomePage() {
  const session = await getAuthSession();
  const userName =
    session?.name?.trim() ||
    session?.email ||
    (session?.type === "env_admin" ? "مدیر سیستم" : null);

  return <ReisHub userName={userName} />;
}
