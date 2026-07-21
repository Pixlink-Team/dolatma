"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { addLeafletTileLayer } from "@/lib/leaflet-tiles";
import { MAP_DEFAULT_CENTER } from "@/lib/iran-location-center";
import { formatPersianNumber } from "@/lib/utils";

interface CapacityMapLeafletProps {
  points: Array<{ id: string; lat: number; lng: number; label: string; count: number }>;
}

export function CapacityMapLeaflet({ points }: CapacityMapLeafletProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;

    void import("leaflet").then((leafletModule) => {
      if (disposed || !containerRef.current) return;
      const L = leafletModule.default;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
        [MAP_DEFAULT_CENTER.lat, MAP_DEFAULT_CENTER.lng],
        5
      );
      addLeafletTileLayer(L, map);
      mapRef.current = map;

      const bounds: Array<[number, number]> = [];
      for (const point of points) {
        const radius = Math.min(22, 8 + point.count);
        const marker = L.circleMarker([point.lat, point.lng], {
          radius,
          color: "#0f766e",
          weight: 2,
          fillColor: "#14b8a6",
          fillOpacity: 0.75,
        });
        marker.bindTooltip(
          `<strong>${point.label}</strong><br/>ظرفیت: ${formatPersianNumber(point.count)}`,
          { direction: "top", opacity: 1 }
        );
        marker.addTo(map);
        bounds.push([point.lat, point.lng]);
      }

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [24, 24] });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 7);
      }
    });

    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [points]);

  return <div ref={containerRef} className="h-72 w-full bg-muted/20" />;
}
