"use client";

import { createContext, useContext } from "react";

interface ContentScoreContextValue {
  canScore: boolean;
  campaignId: string;
}

const ContentScoreContext = createContext<ContentScoreContextValue>({
  canScore: false,
  campaignId: "",
});

export function ContentScoreProvider({
  canScore,
  campaignId,
  children,
}: ContentScoreContextValue & { children: React.ReactNode }) {
  return (
    <ContentScoreContext.Provider value={{ canScore, campaignId }}>
      {children}
    </ContentScoreContext.Provider>
  );
}

export function useContentScoreAccess() {
  return useContext(ContentScoreContext);
}
