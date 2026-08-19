"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { addLeafletTileLayer } from "@/lib/leaflet-tiles";
import { MAP_DEFAULT_CENTER } from "@/lib/iran-location-center";
import { formatPersianNumber } from "@/lib/utils";

interface PresidentMapPoint {
  key: string;
  province: string;
  city: string;
  lat: number;
  lng: number;
  uploads: number;
  views: number;
}

interface PresidentIranMapProps {
  points: PresidentMapPoint[];
  selectedCityKey: string | null;
  onSelectCity: (cityKey: string) => void;
}

export function PresidentIranMap({
  points,
  selectedCityKey,
  onSelectCity,
}: PresidentIranMapProps) {
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
        const isSelected = selectedCityKey === point.key;
        const marker = L.circleMarker([point.lat, point.lng], {
          radius: isSelected ? 14 : 10,
          color: isSelected ? "#dc2626" : "#1d4ed8",
          weight: 2,
          fillColor: isSelected ? "#f87171" : "#60a5fa",
          fillOpacity: 0.8,
        });
        marker.bindTooltip(
          `<strong>${point.city}</strong><br/>${point.province}<br/>محتوا: ${formatPersianNumber(point.uploads)}<br/>بازدید: ${formatPersianNumber(point.views)}`,
          { direction: "top", opacity: 1 }
        );
        marker.on("click", () => onSelectCity(point.key));
        marker.addTo(map);
        bounds.push([point.lat, point.lng]);
      }

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [24, 24] });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 8);
      }
    });

    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [points, selectedCityKey, onSelectCity]);

  return <div ref={containerRef} className="h-[420px] w-full bg-muted/20" />;
}
