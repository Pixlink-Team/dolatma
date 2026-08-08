"use client";

import { ActivityRail } from "@taghvim/components/ActivityRail";
import { StatsBar } from "@taghvim/components/StatsBar";
import { Timeline } from "@taghvim/components/Timeline";
import type { CalendarDay, TimelineStats } from "@taghvim/types/calendar";
import { useCallback, useState } from "react";

type TimelineViewProps = {
  days: CalendarDay[];
  maxScore: number;
  stats: TimelineStats;
};

export function TimelineView({ days, maxScore, stats }: TimelineViewProps) {
  const [expandedDate, setExpandedDate] = useState<string | null>(
    days.find((d) => d.is_featured)?.date ?? days[0]?.date ?? null,
  );
  const [activeDate, setActiveDate] = useState<string | null>(
    days[0]?.date ?? null,
  );

  const onToggle = useCallback((date: string) => {
    setExpandedDate((prev) => (prev === date ? null : date));
  }, []);

  const onSelectRail = useCallback((date: string) => {
    setActiveDate(date);
    setExpandedDate(date);
    document.getElementById(`day-${date}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, []);

  return (
    <div className="space-y-10">
      <StatsBar
        enemy={stats.total_enemy_actions}
        government={stats.total_government_actions}
        days={stats.total_days}
        responseRatio={stats.response_ratio}
      />

      <div className="flex gap-6">
        <ActivityRail
          days={days}
          maxScore={maxScore}
          activeDate={activeDate}
          onSelect={onSelectRail}
        />

        <div className="min-w-0 flex-1">
          <Timeline
            days={days}
            maxScore={maxScore}
            expandedDate={expandedDate}
            onToggle={onToggle}
            onVisibleDate={setActiveDate}
          />
        </div>
      </div>
    </div>
  );
}
