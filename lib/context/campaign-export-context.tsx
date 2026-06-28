"use client";

import { createContext, useContext } from "react";

const CampaignExportContext = createContext(false);

export function CampaignExportProvider({
  exportMode,
  children,
}: {
  exportMode: boolean;
  children: React.ReactNode;
}) {
  return <CampaignExportContext.Provider value={exportMode}>{children}</CampaignExportContext.Provider>;
}

export function useCampaignExportMode(): boolean {
  return useContext(CampaignExportContext);
}
