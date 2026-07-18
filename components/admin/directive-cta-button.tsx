"use client";

import Link from "next/link";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  mapDirectiveCtaKind,
  resolveDirectiveCtaHref,
  resolveDirectiveCtaLabel,
} from "@/lib/directive-cta";
import type { CampaignDirective } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DirectiveCtaButtonProps {
  item: CampaignDirective;
  className?: string;
}

export function DirectiveCtaButton({ item, className }: DirectiveCtaButtonProps) {
  const kind = mapDirectiveCtaKind(item.ctaKind);
  if (kind === "none") return null;

  const href = resolveDirectiveCtaHref({
    kind,
    url: item.ctaUrl,
    target: item.ctaTarget,
    campaignId: item.campaignId,
  });
  const label = resolveDirectiveCtaLabel({
    kind,
    label: item.ctaLabel,
    target: item.ctaTarget,
  });

  if (!href || !label) return null;

  const isExternal = kind === "external";

  return (
    <Button asChild className={cn("w-full sm:w-auto", className)}>
      {isExternal ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          {label}
        </a>
      ) : (
        <Link href={href}>
          <ArrowLeft className="h-4 w-4" />
          {label}
        </Link>
      )}
    </Button>
  );
}
