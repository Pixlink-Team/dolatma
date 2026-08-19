"use client";

import { useCallback, useMemo, useState } from "react";
import {
  IRAN_MAP_PROVINCES,
  IRAN_MAP_CITIES,
  IRAN_MAP_WATERS,
  IRAN_MAP_VIEWBOX,
} from "@/lib/iran-map-paths";
import { cn, formatPersianNumber } from "@/lib/utils";

interface ProvinceData {
  uploads: number;
  views: number;
}

interface PresidentIranMapProps {
  provinceData: Record<string, ProvinceData>;
  selectedProvince: string | null;
  onSelectProvince: (province: string) => void;
}

export function PresidentIranMap({
  provinceData,
  selectedProvince,
  onSelectProvince,
}: PresidentIranMapProps) {
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    name: string;
    data: ProvinceData | null;
  } | null>(null);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent, name: string) => {
      const rect = (event.currentTarget as SVGElement)
        .closest("svg")!
        .getBoundingClientRect();
      setTooltip({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top - 10,
        name,
        data: provinceData[name] ?? null,
      });
    },
    [provinceData]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredProvince(null);
    setTooltip(null);
  }, []);

  const provinceFillClass = useCallback(
    (name: string) => {
      const isSelected = selectedProvince === name;
      const isHovered = hoveredProvince === name;
      const data = provinceData[name];
      const hasData = data && data.uploads > 0;

      if (isSelected) return "fill-primary/50";
      if (isHovered) return "fill-primary/25";
      if (hasData) return "fill-emerald-100 dark:fill-emerald-900/30";
      return "fill-stone-100 dark:fill-zinc-800/60";
    },
    [selectedProvince, hoveredProvince, provinceData]
  );

  const provinceStrokeClass = useCallback(
    (name: string) => {
      const isSelected = selectedProvince === name;
      const isHovered = hoveredProvince === name;
      if (isSelected) return "stroke-primary stroke-[1.8]";
      if (isHovered) return "stroke-primary/60 stroke-[1.2]";
      return "stroke-zinc-300 dark:stroke-zinc-600 stroke-[0.6]";
    },
    [selectedProvince, hoveredProvince]
  );

  // Only show cities for selected province, or all major ones when none selected
  const visibleCities = useMemo(() => {
    if (selectedProvince) {
      return IRAN_MAP_CITIES.filter((c) => c.province === selectedProvince);
    }
    return IRAN_MAP_CITIES;
  }, [selectedProvince]);

  return (
    <div className="relative select-none overflow-hidden rounded-xl bg-sky-50/50 dark:bg-slate-900/40">
      <svg viewBox={IRAN_MAP_VIEWBOX} className="h-auto w-full" style={{ maxHeight: 580 }}>
        {/* Water bodies */}
        {IRAN_MAP_WATERS.map((water) => (
          <g key={water.name}>
            <path
              d={water.d}
              className="fill-sky-200/50 stroke-sky-300/60 dark:fill-sky-900/30 dark:stroke-sky-700/40"
              strokeWidth="0.5"
            />
            <text
              x={water.labelX}
              y={water.labelY}
              textAnchor="middle"
              className="fill-sky-400/80 dark:fill-sky-500/60"
              fontSize="10"
              fontStyle="italic"
            >
              {water.name}
            </text>
          </g>
        ))}

        {/* Province shapes */}
        {IRAN_MAP_PROVINCES.map((prov) => (
          <path
            key={prov.name}
            d={prov.d}
            className={cn(
              "cursor-pointer transition-colors duration-100",
              provinceFillClass(prov.name),
              provinceStrokeClass(prov.name)
            )}
            strokeLinejoin="round"
            onMouseEnter={() => setHoveredProvince(prov.name)}
            onMouseMove={(e) => handleMouseMove(e, prov.name)}
            onMouseLeave={handleMouseLeave}
            onClick={() => onSelectProvince(prov.name)}
          />
        ))}

        {/* Province name labels */}
        {IRAN_MAP_PROVINCES.map((prov) => (
          <text
            key={`lbl-${prov.name}`}
            x={prov.cx}
            y={prov.cy}
            textAnchor="middle"
            dominantBaseline="central"
            className={cn(
              "pointer-events-none",
              selectedProvince === prov.name
                ? "fill-primary font-bold"
                : "fill-zinc-500 dark:fill-zinc-400"
            )}
            fontSize={selectedProvince === prov.name || hoveredProvince === prov.name ? "8.5" : "7"}
          >
            {prov.name}
          </text>
        ))}

        {/* City dots + labels */}
        {visibleCities.map((city) => (
          <g key={`c-${city.name}-${city.x}`} className="pointer-events-none">
            <circle
              cx={city.x}
              cy={city.y}
              r="1.5"
              className="fill-zinc-400 dark:fill-zinc-500"
            />
            <text
              x={city.x}
              y={city.y - 3.5}
              textAnchor="middle"
              className="fill-zinc-400 dark:fill-zinc-500"
              fontSize="5"
            >
              {city.name}
            </text>
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-bold">{tooltip.name}</p>
          {tooltip.data ? (
            <div className="mt-1 space-y-0.5 text-muted-foreground">
              <p>محتوا: {formatPersianNumber(tooltip.data.uploads)}</p>
              <p>بازدید: {formatPersianNumber(tooltip.data.views)}</p>
            </div>
          ) : (
            <p className="mt-1 text-muted-foreground">بدون داده</p>
          )}
        </div>
      )}
    </div>
  );
}
