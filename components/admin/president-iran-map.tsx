"use client";

import { useCallback, useState } from "react";
import { IRAN_MAP_PROVINCES, IRAN_MAP_VIEWBOX } from "@/lib/iran-map-paths";
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
      const rect = (event.currentTarget as SVGElement).closest("svg")!.getBoundingClientRect();
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
    <div className="relative select-none">
      <svg
        viewBox={IRAN_MAP_VIEWBOX}
        className="h-auto w-full"
        style={{ maxHeight: 520 }}
      >
        {IRAN_MAP_PROVINCES.map((prov) => {
          const isSelected = selectedProvince === prov.name;
          const isHovered = hoveredProvince === prov.name;
          const data = provinceData[prov.name];
          const hasData = data && data.uploads > 0;

          return (
            <path
              key={prov.name}
              d={prov.d}
              className={cn(
                "cursor-pointer stroke-border/80 transition-colors duration-150",
                isSelected
                  ? "fill-primary/60 stroke-primary stroke-[2]"
                  : isHovered
                    ? "fill-primary/30 stroke-primary/60 stroke-[1.5]"
                    : hasData
                      ? "fill-primary/15 stroke-border"
                      : "fill-muted/40 stroke-border"
              )}
              strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.8}
              onMouseEnter={() => setHoveredProvince(prov.name)}
              onMouseMove={(event) => handleMouseMove(event, prov.name)}
              onMouseLeave={handleMouseLeave}
              onClick={() => onSelectProvince(prov.name)}
            />
          );
        })}
      </svg>

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
