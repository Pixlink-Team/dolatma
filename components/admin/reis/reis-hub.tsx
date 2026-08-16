"use client";

import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ClipboardCheck,
  ExternalLink,
  FileBarChart,
  Megaphone,
  MessageSquareQuote,
  Radar,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAdminCampaign } from "@/components/admin/admin-campaign-provider";
import { REIS_SECTIONS, type ReisSectionKey } from "@/lib/reis/sections";
import { adminHref, cn, formatPersianNumber } from "@/lib/utils";

const SECTION_ICONS: Record<ReisSectionKey, LucideIcon> = {
  campaigns: Megaphone,
  strategic: ClipboardCheck,
  monitoring: Radar,
  "defense-calendar": CalendarDays,
  education: BookOpen,
  meetings: Users,
  narrative: MessageSquareQuote,
  reporting: FileBarChart,
  settings: Settings,
};

type ReisHubProps = {
  userName?: string | null;
};

export function ReisHub({ userName }: ReisHubProps) {
  const displayName = userName?.trim() || null;
  const { campaignId } = useAdminCampaign();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      <header className="space-y-3 text-center sm:text-right">
        <p className="text-sm font-medium text-primary">پنل دسترسی رییس</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {displayName ? (
            <>
              {displayName}
              <span className="font-semibold text-muted-foreground">، خوش آمدید</span>
            </>
          ) : (
            "خوش آمدید"
          )}
        </h1>
        <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground sm:mx-0">
          از میان بخش‌های زیر، مسیر مورد نظر خود را انتخاب کنید. هر بخش نمای
          اختصاصی خود را دارد و کل سامانه در این سطح نمایش داده نمی‌شود.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REIS_SECTIONS.map((section, index) => {
          const Icon = SECTION_ICONS[section.key];
          const href =
            section.external || !campaignId
              ? section.href
              : adminHref(section.href, campaignId);
          const cardClass = cn(
            "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-apple)] transition-[transform,box-shadow,border-color] duration-[var(--duration-apple)] ease-[var(--ease-apple)]",
            "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-apple-hover)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          );

          const body = (
            <>
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 transition-opacity duration-[var(--duration-apple)] group-hover:opacity-100",
                  section.accent
                )}
              />
              <div className="relative flex flex-1 flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl",
                      section.iconBg
                    )}
                  >
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <span className="rounded-full bg-background/70 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur">
                    {formatPersianNumber(index + 1).padStart(2, "۰")}
                  </span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold leading-snug">{section.title}</h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {section.description}
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-medium text-primary">
                  {section.external ? (
                    <>
                      ورود به سامانه
                      <ExternalLink className="h-4 w-4" aria-hidden />
                    </>
                  ) : (
                    <>
                      ورود به بخش
                      <ChevronLeft className="h-4 w-4 transition-transform duration-[var(--duration-apple-fast)] group-hover:-translate-x-0.5" />
                    </>
                  )}
                </div>
              </div>
            </>
          );

          if (section.external) {
            return (
              <a
                key={section.key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cardClass}
              >
                {body}
              </a>
            );
          }

          return (
            <Link key={section.key} href={href} className={cardClass}>
              {body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
