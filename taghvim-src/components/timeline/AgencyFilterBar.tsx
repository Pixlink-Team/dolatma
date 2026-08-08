"use client";

import { listAgencies } from "@taghvim/lib/agency-store";
import type { GovernmentAgency } from "@taghvim/types/agency";
import clsx from "clsx";
import { useEffect, useState } from "react";

type AgencyFilterBarProps = {
  value: string | "all";
  onChange: (agencyId: string | "all") => void;
  className?: string;
};

export function AgencyFilterBar({
  value,
  onChange,
  className,
}: AgencyFilterBarProps) {
  const [agencies, setAgencies] = useState<GovernmentAgency[]>([]);

  useEffect(() => {
    setAgencies(listAgencies({ activeOnly: true }));
  }, []);

  return (
    <div
      className={clsx(
        "flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-thin",
        className,
      )}
      role="tablist"
      aria-label="فیلتر وزارتخانه"
    >
      <FilterChip
        active={value === "all"}
        label="همه وزارتخانه‌ها"
        onClick={() => onChange("all")}
      />
      {agencies.map((agency) => (
        <FilterChip
          key={agency.id}
          active={value === agency.id}
          label={agency.shortName}
          title={agency.name}
          onClick={() => onChange(agency.id)}
        />
      ))}
    </div>
  );
}

function FilterChip({
  active,
  label,
  title,
  onClick,
}: {
  active: boolean;
  label: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      title={title}
      onClick={onClick}
      className={clsx(
        "shrink-0 rounded-xl border px-3 py-1.5 text-xs transition",
        active
          ? "border-[var(--primary)] bg-blue-500/15 font-semibold text-[var(--primary)]"
          : "border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:bg-[var(--hover)]",
      )}
    >
      {label}
    </button>
  );
}
