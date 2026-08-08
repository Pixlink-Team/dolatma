"use client";

import { NotificationBell } from "@taghvim/components/notifications/NotificationBell";
import { MobileMenuButton } from "@taghvim/components/layout/AppSidebar";
import { PersianDatePicker } from "@taghvim/components/shared/PersianDatePicker";
import { ThemeToggle } from "@taghvim/components/theme/ThemeToggle";
import { SiteMottoBanner } from "@taghvim/components/brand/SiteMottoBanner";
import { ViewSwitcher } from "@taghvim/components/timeline/ViewSwitcher";
import type { TimelineViewMode } from "@taghvim/types/timeline";
import { Filter, Search } from "lucide-react";

type TimelineHeaderProps = {
  showViewSwitcher?: boolean;
  showDateFilters?: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onOpenFilters: () => void;
  onOpenMobileMenu: () => void;
  activeFilterCount?: number;
  selectedView: TimelineViewMode;
  onViewChange: (view: TimelineViewMode) => void;
};

export function TimelineHeader({
  searchQuery,
  onSearchChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onOpenFilters,
  onOpenMobileMenu,
  activeFilterCount = 0,
  selectedView,
  onViewChange,
  showViewSwitcher = false,
  showDateFilters = false,
}: TimelineHeaderProps) {
  const showExtras = showViewSwitcher || showDateFilters;

  return (
    <header className="z-30 shrink-0 bg-[var(--background)] px-2 pb-2 pt-1 md:space-y-2 md:border-b md:border-[var(--border)] md:px-0">
      <SiteMottoBanner className="hidden md:flex" />

      <div className="flex items-center gap-2 md:gap-3">
        <MobileMenuButton onClick={onOpenMobileMenu} />

        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="جست‌وجوی رویداد..."
            inputMode="search"
            enterKeyHint="search"
            className="mobile-input w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] py-2.5 pr-10 pl-3 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-blue-500/50 md:text-sm"
            aria-label="جست‌وجو"
          />
        </label>

        <button
          type="button"
          onClick={onOpenFilters}
          className="touch-target inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 text-xs text-[var(--text-primary)] hover:bg-[var(--hover)]"
        >
          <Filter className="h-4 w-4" />
          <span className="hidden md:inline">فیلترها</span>
          {activeFilterCount > 0 ? (
            <span className="rounded-md bg-blue-500/15 px-1.5 text-[10px] text-[var(--primary)]">
              {activeFilterCount.toLocaleString("fa-IR")}
            </span>
          ) : null}
        </button>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <NotificationBell />
        </div>
      </div>

      {showExtras ? (
        <div className="flex flex-wrap items-center gap-2">
          {showViewSwitcher ? (
            <ViewSwitcher value={selectedView} onChange={onViewChange} compact />
          ) : null}
          {showDateFilters ? (
            <>
              <PersianDatePicker
                compact
                value={dateFrom}
                onChange={onDateFromChange}
                placeholder="از تاریخ"
                ariaLabel="از تاریخ"
                className="min-w-[130px]"
              />
              <PersianDatePicker
                compact
                value={dateTo}
                onChange={onDateToChange}
                placeholder="تا تاریخ"
                ariaLabel="تا تاریخ"
                className="min-w-[130px]"
              />
            </>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
