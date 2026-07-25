import { redirect } from "next/navigation";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { OnboardingStepsAdmin } from "@/components/admin/onboarding-steps-admin";

export default async function OnboardingStepsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!isFullAdmin(session)) redirect("/admin");

  return <OnboardingStepsAdmin />;
}
