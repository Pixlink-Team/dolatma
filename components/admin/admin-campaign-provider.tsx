"use client";

import { createContext, useContext, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CampaignSettings } from "@/lib/types";

interface AdminCampaignContextValue {
  campaignId: string;
  campaigns: CampaignSettings[];
  currentCampaign: CampaignSettings | undefined;
  setCampaignId: (id: string) => void;
}

const AdminCampaignContext = createContext<AdminCampaignContextValue | null>(null);

export function AdminCampaignProvider({
  campaigns,
  children,
}: {
  campaigns: CampaignSettings[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultId = campaigns[0]?.id ?? "";
  const campaignId = searchParams.get("campaign") ?? defaultId;

  const currentCampaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? campaigns[0],
    [campaigns, campaignId]
  );

  const setCampaignId = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("campaign", id);
    router.push(`?${params.toString()}`);
  };

  return (
    <AdminCampaignContext.Provider
      value={{
        campaignId: currentCampaign?.id ?? campaignId,
        campaigns,
        currentCampaign,
        setCampaignId,
      }}
    >
      {children}
    </AdminCampaignContext.Provider>
  );
}

export function useAdminCampaign() {
  const ctx = useContext(AdminCampaignContext);
  if (!ctx) throw new Error("useAdminCampaign must be used within AdminCampaignProvider");
  return ctx;
}
