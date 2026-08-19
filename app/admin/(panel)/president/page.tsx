import { redirect } from "next/navigation";
import { PresidentDashboard } from "@/components/admin/president-dashboard";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { getPresidentDashboardData } from "@/lib/data-access/president-dashboard";

interface PageProps {
  searchParams: Promise<{ owner?: string; range?: string }>;
}

function resolveDateRange(value?: string): "all" | "30d" | "90d" {
  if (value === "all" || value === "90d") return value;
  return "30d";
}

export default async function PresidentPage({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!isFullAdmin(session) && session.role !== "client") redirect("/admin");

  const params = await searchParams;
  const dateRange = resolveDateRange(params.range);
  const selectedOwnerId = isFullAdmin(session) ? params.owner?.trim() || null : null;
  const data = await getPresidentDashboardData({
    ownerId: selectedOwnerId,
    dateRange,
  });

  return (
    <PresidentDashboard
      data={data}
      selectedOwnerId={selectedOwnerId}
      dateRange={dateRange}
    />
  );
}
