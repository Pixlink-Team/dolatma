"use client";

import { useEffect, useState } from "react";

const DEFAULT_RELOAD_MS = 5 * 60 * 1000;

interface MetabaseDashboardEmbedProps {
  embedUrl: string;
  title?: string;
  reloadIntervalMs?: number;
}

export function MetabaseDashboardEmbed({
  embedUrl,
  title = "Metabase dashboard",
  reloadIntervalMs = DEFAULT_RELOAD_MS,
}: MetabaseDashboardEmbedProps) {
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIframeKey((current) => current + 1);
    }, reloadIntervalMs);

    return () => clearInterval(interval);
  }, [embedUrl, reloadIntervalMs]);

  return (
    <div className="max-h-[70vh] overflow-y-auto overscroll-y-contain rounded-xl border bg-background">
      <iframe
        key={iframeKey}
        src={embedUrl}
        title={title}
        className="min-h-[720px] w-full border-0"
        allowTransparency
      />
    </div>
  );
}
