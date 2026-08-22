"use client";

import { useEffect, useRef } from "react";
import { APP_BUILD_ID } from "@/lib/app-build-id";
import { refreshForNewBuild } from "@/lib/app-errors/stale-page-refresh";

const POLL_INTERVAL_MS = 90_000;

async function fetchServerBuildId(): Promise<string | null> {
  try {
    const response = await fetch("/api/app-version", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { buildId?: unknown };
    return typeof data.buildId === "string" && data.buildId.length > 0 ? data.buildId : null;
  } catch {
    return null;
  }
}

/**
 * Polls the server build id and reloads before the user hits stale Server Actions.
 */
export function StalePageGuard() {
  const checkingRef = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (checkingRef.current || document.visibilityState === "hidden") return;
      checkingRef.current = true;
      try {
        const serverBuildId = await fetchServerBuildId();
        if (serverBuildId && serverBuildId !== APP_BUILD_ID) {
          refreshForNewBuild();
        }
      } finally {
        checkingRef.current = false;
      }
    };

    void check();

    const intervalId = window.setInterval(() => {
      void check();
    }, POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void check();
      }
    };

    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
