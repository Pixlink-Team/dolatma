import { redirect } from "next/navigation";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { TutorialsAdmin } from "@/components/admin/tutorials-admin";

export default async function TutorialsPage() {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    redirect("/admin");
  }

  return <TutorialsAdmin />;
}
