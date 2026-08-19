"use client";

import { useCallback, useState } from "react";
import {
  IRAN_MAP_PROVINCES,
  IRAN_MAP_CITIES,
  IRAN_MAP_WATERS,
  IRAN_MAP_VIEWBOX,
} from "@/lib/iran-map-paths";
import { formatPersianNumber } from "@/lib/utils";

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

  return (
    <div className="relative select-none overflow-hidden rounded-xl bg-gradient-to-b from-sky-50/60 to-blue-50/40 dark:from-sky-950/30 dark:to-blue-950/20">
      <svg viewBox={IRAN_MAP_VIEWBOX} className="h-auto w-full" style={{ maxHeight: 580 }}>
        <defs>
          <linearGradient id="water-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="water-gradient-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0.3" />
          </linearGradient>
          <filter id="province-shadow" x="-2%" y="-2%" width="104%" height="104%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Water bodies */}
        {IRAN_MAP_WATERS.map((water) => (
          <g key={water.name}>
            <path
              d={water.d}
              fill="url(#water-gradient)"
              stroke="#93c5fd"
              strokeWidth="0.8"
              strokeDasharray="4 2"
              opacity="0.7"
              className="dark:fill-[url(#water-gradient-dark)] dark:stroke-blue-800"
            />
            <text
              x={water.labelX}
              y={water.labelY}
              textAnchor="middle"
              className="fill-blue-400/70 dark:fill-blue-500/50"
              fontSize="11"
              fontFamily="system-ui, sans-serif"
              fontStyle="italic"
            >
              {water.name}
            </text>
          </g>
        ))}

        {/* Province shapes */}
        {IRAN_MAP_PROVINCES.map((prov) => {
          const isSelected = selectedProvince === prov.name;
          const isHovered = hoveredProvince === prov.name;
          const data = provinceData[prov.name];
          const hasData = data && data.uploads > 0;

          let fill: string;
          let stroke: string;
          let strokeW: number;
          let opacity = 1;

          if (isSelected) {
            fill = "hsl(var(--primary) / 0.5)";
            stroke = "hsl(var(--primary))";
            strokeW = 2.2;
          } else if (isHovered) {
            fill = "hsl(var(--primary) / 0.25)";
            stroke = "hsl(var(--primary) / 0.7)";
            strokeW = 1.6;
          } else if (hasData) {
            fill = "hsl(var(--primary) / 0.1)";
            stroke = "hsl(var(--border))";
            strokeW = 0.7;
          } else {
            fill = "hsl(var(--muted) / 0.35)";
            stroke = "hsl(var(--border) / 0.6)";
            strokeW = 0.5;
            opacity = 0.85;
          }

          return (
            <path
              key={prov.name}
              d={prov.d}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeW}
              strokeLinejoin="round"
              opacity={opacity}
              filter="url(#province-shadow)"
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredProvince(prov.name)}
              onMouseMove={(e) => handleMouseMove(e, prov.name)}
              onMouseLeave={handleMouseLeave}
              onClick={() => onSelectProvince(prov.name)}
            />
          );
        })}

        {/* Province labels */}
        {IRAN_MAP_PROVINCES.map((prov) => {
          const isSelected = selectedProvince === prov.name;
          const isHovered = hoveredProvince === prov.name;
          return (
            <text
              key={`label-${prov.name}`}
              x={prov.cx}
              y={prov.cy}
              textAnchor="middle"
              dominantBaseline="central"
              className="pointer-events-none select-none fill-foreground/70 dark:fill-foreground/60"
              fontSize={isSelected || isHovered ? "9" : "7.5"}
              fontWeight={isSelected ? "700" : "400"}
              fontFamily="system-ui, sans-serif"
              direction="rtl"
            >
              {prov.name}
            </text>
          );
        })}

        {/* City dots + labels */}
        {IRAN_MAP_CITIES.map((city) => (
          <g key={`city-${city.name}-${city.x}-${city.y}`} className="pointer-events-none">
            <circle
              cx={city.x}
              cy={city.y}
              r="2"
              className="fill-foreground/50 dark:fill-foreground/40"
            />
            <text
              x={city.x}
              y={city.y - 4}
              textAnchor="middle"
              className="fill-foreground/45 dark:fill-foreground/35"
              fontSize="5.5"
              fontFamily="system-ui, sans-serif"
              direction="rtl"
            >
              {city.name}
            </text>
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
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
