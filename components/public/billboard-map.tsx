"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { buildBillboardMapTooltipHtml } from "@/lib/billboard-map-popup";
import { hasBillboardCoordinates } from "@/lib/billboards";
import { addLeafletTileLayer } from "@/lib/leaflet-tiles";
import type { Billboard } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BillboardMapProps {
  billboards: Billboard[];
  onSelect: (billboard: Billboard) => void;
  containerClassName?: string;
  scrollWheelZoom?: boolean;
  active?: boolean;
}

export function BillboardMap({
  billboards,
  onSelect,
  containerClassName = "h-[420px]",
  scrollWheelZoom = false,
  active = true,
}: BillboardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const mappableBillboards = useMemo(
    () => billboards.filter(hasBillboardCoordinates),
    [billboards]
  );

  const mapPointsKey = useMemo(
    () =>
      mappableBillboards
        .map((billboard) => `${billboard.id}:${billboard.latitude}:${billboard.longitude}`)
        .join("|"),
    [mappableBillboards]
  );

  useEffect(() => {
    if (!active || !containerRef.current || mappableBillboards.length === 0) return;

    let disposed = false;

    void import("leaflet").then((leafletModule) => {
      if (disposed || !containerRef.current) return;

      const L = leafletModule.default;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const first = mappableBillboards[0];
      const map = L.map(containerRef.current, {
        scrollWheelZoom,
      }).setView([first.latitude!, first.longitude!], 12);

      addLeafletTileLayer(L, map);

      mappableBillboards.forEach((billboard) => {
        const marker = L.circleMarker([billboard.latitude!, billboard.longitude!], {
          radius: 8,
          color: "#2563eb",
          weight: 2,
          fillColor: "#2563eb",
          fillOpacity: 0.85,
        });

        marker.bindTooltip(buildBillboardMapTooltipHtml(billboard), {
          direction: "top",
          offset: [0, -10],
          opacity: 1,
          className: "billboard-map-tooltip",
          interactive: true,
          sticky: false,
        });

        marker.on("mouseover", () => {
          marker.openTooltip();
        });
        marker.on("mouseout", () => {
          marker.closeTooltip();
        });

        marker.on("click", () => onSelectRef.current(billboard));
        marker.addTo(map);
      });

      if (mappableBillboards.length > 1) {
        const bounds = L.latLngBounds(
          mappableBillboards.map((billboard) => [billboard.latitude!, billboard.longitude!])
        );
        map.fitBounds(bounds, { padding: [32, 32] });
      }

      mapRef.current = map;

      requestAnimationFrame(() => {
        map.invalidateSize();
      });
    });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [active, mapPointsKey, mappableBillboards, scrollWheelZoom]);

  useEffect(() => {
    if (!active || !mapRef.current) return;

    requestAnimationFrame(() => {
      mapRef.current?.invalidateSize();
    });
  }, [active, containerClassName]);

  if (mappableBillboards.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        موقعیت جغرافیایی برای نمایش روی نقشه موجود نیست.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div ref={containerRef} className={cn("w-full", containerClassName)} />
    </div>
  );
}
