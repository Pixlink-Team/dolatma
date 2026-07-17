"use client";

import { createContext, useContext, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CampaignSettings } from "@/lib/types";

interface AdminCampaignContextValue {
  campaignId: string;
  campaigns: CampaignSettings[];
  currentCampaign: CampaignSettings | undefined;
  setCampaignId: (id: string) => void;
}

const AdminCampaignContext = createContext<AdminCampaignContextValue | null>(null);

function useCampaignContextValue(
  campaigns: CampaignSettings[],
  campaignId: string
): AdminCampaignContextValue {
  const router = useRouter();
  const pathname = usePathname();

  const currentCampaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? campaigns[0],
    [campaigns, campaignId]
  );

  const setCampaignId = (id: string) => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    params.set("campaign", id);
    router.push(`${pathname}?${params.toString()}`);
  };

  return {
    campaignId: currentCampaign?.id ?? campaignId,
    campaigns,
    currentCampaign,
    setCampaignId,
  };
}

/** Provider that receives campaignId from the parent (searchParams-aware shell). */
export function AdminCampaignProvider({
  campaigns,
  campaignId,
  children,
}: {
  campaigns: CampaignSettings[];
  campaignId: string;
  children: React.ReactNode;
}) {
  const value = useCampaignContextValue(campaigns, campaignId);
  return (
    <AdminCampaignContext.Provider value={value}>{children}</AdminCampaignContext.Provider>
  );
}

/** Static fallback provider used while searchParams are suspending. */
export function AdminCampaignProviderStatic({
  campaigns,
  campaignId,
  children,
}: {
  campaigns: CampaignSettings[];
  campaignId: string;
  children: React.ReactNode;
}) {
  const value = useCampaignContextValue(campaigns, campaignId);
  return (
    <AdminCampaignContext.Provider value={value}>{children}</AdminCampaignContext.Provider>
  );
}

export function useAdminCampaign() {
  const ctx = useContext(AdminCampaignContext);
  if (!ctx) throw new Error("useAdminCampaign must be used within AdminCampaignProvider");
  return ctx;
}
