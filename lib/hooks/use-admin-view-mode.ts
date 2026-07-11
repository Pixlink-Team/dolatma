"use client";

import { useEffect, useState } from "react";
import type { AdminViewMode } from "@/components/admin/admin-view-mode-toggle";

const STORAGE_PREFIX = "admin-view-mode:";

export function useAdminViewMode(sectionKey: string, fallback: AdminViewMode = "grid") {
  const storageKey = `${STORAGE_PREFIX}${sectionKey}`;
  const [viewMode, setViewModeState] = useState<AdminViewMode>(fallback);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "grid" || stored === "list") {
        setViewModeState(stored);
      }
    } catch {
      // Ignore storage access errors.
    }
  }, [storageKey]);

  const setViewMode = (mode: AdminViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(storageKey, mode);
    } catch {
      // Ignore storage access errors.
    }
  };

  return { viewMode, setViewMode };
}
