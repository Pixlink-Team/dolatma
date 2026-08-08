"use client";

import { IranFlag } from "@taghvim/components/brand/IranFlag";
import { getSiteBranding } from "@taghvim/lib/branding";
import { useEffect, useState } from "react";

type SiteMottoBannerProps = {
  compact?: boolean;
  className?: string;
};

export function SiteMottoBanner({
  compact = false,
  className = "",
}: SiteMottoBannerProps) {
  const [slogan, setSlogan] = useState("دولت پای کار مردم");

  useEffect(() => {
    const branding = getSiteBranding();
    setSlogan(branding.siteSlogan?.trim() || "دولت پای کار مردم");
  }, []);

  return (
    <div
      className={`flex items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 ${
        compact ? "py-1.5" : "py-2.5"
      } ${className}`}
      style={{ direction: "rtl" }}
    >
      <IranFlag className={compact ? "h-5 w-8 shrink-0" : "h-7 w-11 shrink-0"} />
      <p
        className={`font-bold tracking-wide text-[var(--text-primary)] ${
          compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
        }`}
      >
        {slogan}
      </p>
      <IranFlag className={compact ? "h-5 w-8 shrink-0" : "h-7 w-11 shrink-0"} />
    </div>
  );
}
