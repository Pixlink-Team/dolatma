"use client";

import { MapPin, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

type LocationMapPickerProps = {
  value: MapCoordinates | null;
  onChange: (value: MapCoordinates | null) => void;
};

const IRAN_CENTER: MapCoordinates = {
  latitude: 32.4279,
  longitude: 53.688,
};

const DEFAULT_ZOOM = 5;
const PINNED_ZOOM = 12;

export function LocationMapPicker({ value, onChange }: LocationMapPickerProps) {
  const mapId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [enabled, setEnabled] = useState(Boolean(value));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (value) setEnabled(true);
  }, [value]);

  useEffect(() => {
    if (!enabled) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        setReady(false);
      }
      return;
    }

    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    void (async () => {
      const L = (await import("leaflet")).default;

      if (cancelled || !containerRef.current || mapRef.current) return;

      // Fix default marker icons under bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const start = value ?? IRAN_CENTER;
      const map = L.map(containerRef.current, {
        center: [start.latitude, start.longitude],
        zoom: value ? PINNED_ZOOM : DEFAULT_ZOOM,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      map.on("click", (e) => {
        onChangeRef.current({
          latitude: Number(e.latlng.lat.toFixed(7)),
          longitude: Number(e.latlng.lng.toFixed(7)),
        });
      });

      mapRef.current = map;
      setReady(true);
      requestAnimationFrame(() => map.invalidateSize());
      setTimeout(() => map.invalidateSize(), 200);
    })();

    return () => {
      cancelled = true;
    };
    // Only bootstrap when map panel is enabled
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    void (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      if (!map) return;

      if (!value) {
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
          markerRef.current = null;
        }
        return;
      }

      const latLng: [number, number] = [value.latitude, value.longitude];
      if (markerRef.current) {
        markerRef.current.setLatLng(latLng);
      } else {
        markerRef.current = L.marker(latLng).addTo(map);
      }
    })();
  }, [ready, value]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-[var(--text-secondary)]">
            موقعیت روی نقشه
            <span className="ms-1 text-[var(--text-muted)]">(اختیاری)</span>
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
            با کلیک روی نقشه می‌توانید نقطه را مشخص کنید.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {value ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف پین
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (enabled) {
                onChange(null);
                setEnabled(false);
              } else {
                setEnabled(true);
              }
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium ${
              enabled
                ? "bg-blue-600 text-white"
                : "border border-dashed border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--hover)]"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            {enabled ? "نقشه فعال" : "پین روی نقشه"}
          </button>
        </div>
      </div>

      {enabled ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
          <div
            id={`location-map-${mapId}`}
            ref={containerRef}
            className="h-56 w-full bg-[var(--panel-2)] [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:font-[inherit]"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-3)] px-3 py-2 text-[10px] text-[var(--text-muted)]">
            {value ? (
              <span>
                مختصات:{" "}
                {value.latitude.toLocaleString("fa-IR", {
                  maximumFractionDigits: 5,
                })}
                {" ، "}
                {value.longitude.toLocaleString("fa-IR", {
                  maximumFractionDigits: 5,
                })}
              </span>
            ) : (
              <span>هنوز نقطه‌ای انتخاب نشده — روی نقشه کلیک کنید</span>
            )}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--text-secondary)]"
            >
              © OpenStreetMap
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
