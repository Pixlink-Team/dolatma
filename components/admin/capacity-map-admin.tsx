"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProvinceCityFields } from "@/components/admin/province-city-fields";
import { getNationalCapacityMapAction } from "@/lib/actions/capacity-actions";
import {
  formatCapacityDetailsSummary,
  getCapacityPrimaryMetric,
  normalizeCapacityDetails,
} from "@/lib/capacity-details";
import { DEVICE_CAPACITY_TYPE_LABELS } from "@/lib/device-labels";
import { getLocationCenter, MAP_DEFAULT_CENTER } from "@/lib/iran-location-center";
import type { CapacityMapItem, DeviceCapacityType } from "@/lib/types";
import { formatPersianNumber } from "@/lib/utils";
import dynamic from "next/dynamic";

const CapacityMapLeaflet = dynamic(
  () =>
    import("@/components/admin/capacity-map-leaflet").then((mod) => mod.CapacityMapLeaflet),
  { ssr: false, loading: () => <div className="h-72 rounded-lg border bg-muted/30" /> }
);

interface CapacityMapAdminProps {
  initialItems: CapacityMapItem[];
  devices: Array<{ id: string; name: string }>;
}

export function CapacityMapAdmin({ initialItems, devices }: CapacityMapAdminProps) {
  const [items, setItems] = useState(initialItems);
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [deviceId, setDeviceId] = useState<string>("all");
  const [capacityType, setCapacityType] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  const typeOptions = useMemo(
    () => Object.keys(DEVICE_CAPACITY_TYPE_LABELS) as DeviceCapacityType[],
    []
  );

  const summary = useMemo(() => {
    const byType = new Map<string, number>();
    const byProvince = new Map<string, number>();
    let deviceCount = 0;
    let userCount = 0;
    let metricSum = 0;
    let metricCount = 0;
    let metricUnit = "";
    for (const item of items) {
      if (!item.isActive) continue;
      byType.set(item.capacityType, (byType.get(item.capacityType) ?? 0) + 1);
      const mapProvince = item.mapProvince ?? item.province;
      if (mapProvince) {
        byProvince.set(mapProvince, (byProvince.get(mapProvince) ?? 0) + 1);
      }
      if (item.source === "device") deviceCount += 1;
      else userCount += 1;

      const metric = getCapacityPrimaryMetric(
        item.capacityType,
        normalizeCapacityDetails(item.capacityType, item.details)
      );
      if (metric) {
        metricSum += metric.value;
        metricCount += 1;
        if (!metricUnit) metricUnit = metric.unitLabel;
        else if (metricUnit !== metric.unitLabel) metricUnit = "واحد ترکیبی";
      }
    }
    return {
      byType,
      byProvince,
      deviceCount,
      userCount,
      total: deviceCount + userCount,
      metricSum,
      metricCount,
      metricUnit,
    };
  }, [items]);

  const mapPoints = useMemo(() => {
    const points: Array<{ id: string; lat: number; lng: number; label: string; count: number }> =
      [];
    for (const [provinceName, count] of summary.byProvince.entries()) {
      const center = getLocationCenter(provinceName) ?? MAP_DEFAULT_CENTER;
      points.push({
        id: provinceName,
        lat: center.lat,
        lng: center.lng,
        label: provinceName,
        count,
      });
    }
    return points;
  }, [summary.byProvince]);

  const applyFilters = () => {
    startTransition(async () => {
      const result = await getNationalCapacityMapAction({
        province: province || null,
        city: city || null,
        deviceId: deviceId === "all" ? null : deviceId,
        capacityType:
          capacityType === "all" ? null : (capacityType as DeviceCapacityType),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setItems(result.items);
    });
  };

  const exportCsv = () => {
    const header = [
      "source",
      "title",
      "capacityType",
      "device",
      "user",
      "province",
      "city",
      "address",
      "summary",
      "metricValue",
      "metricUnit",
      "isActive",
    ];
    const rows = items.map((item) => {
      const details = normalizeCapacityDetails(item.capacityType, item.details);
      const summaryText = formatCapacityDetailsSummary(item.capacityType, details, {
        province: item.mapProvince ?? item.province,
        city: item.mapCity ?? item.city,
        address: item.address,
      });
      const metric = getCapacityPrimaryMetric(item.capacityType, details);
      return [
        item.source,
        item.title,
        DEVICE_CAPACITY_TYPE_LABELS[item.capacityType],
        item.deviceName ?? "",
        item.userName ?? "",
        item.mapProvince ?? item.province ?? "",
        item.mapCity ?? item.city ?? "",
        item.address ?? "",
        summaryText,
        metric?.value ?? "",
        metric?.unitLabel ?? "",
        item.isActive ? "active" : "inactive",
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",");
    });
    const csv = "\uFEFF" + [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `capacity-report-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-4">
        <ProvinceCityFields
          province={province}
          city={city}
          onProvinceChange={setProvince}
          onCityChange={setCity}
        />
        <div className="space-y-1.5">
          <Label>دستگاه</Label>
          <Select value={deviceId} onValueChange={setDeviceId}>
            <SelectTrigger>
              <SelectValue placeholder="همه" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه دستگاه‌ها</SelectItem>
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  {device.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>نوع ظرفیت</Label>
          <Select value={capacityType} onValueChange={setCapacityType}>
            <SelectTrigger>
              <SelectValue placeholder="همه" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه انواع</SelectItem>
              {typeOptions.map((key) => (
                <SelectItem key={key} value={key}>
                  {DEVICE_CAPACITY_TYPE_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={applyFilters} disabled={isPending} className="flex-1">
            {isPending ? "در حال فیلتر..." : "اعمال فیلتر"}
          </Button>
          <Button type="button" variant="outline" onClick={exportCsv}>
            خروجی CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="کل ظرفیت فعال" value={summary.total} />
        <StatCard label="ظرفیت دستگاه‌ها" value={summary.deviceCount} />
        <StatCard label="ظرفیت کاربران" value={summary.userCount} />
        <StatCard
          label={
            summary.metricCount > 0
              ? `جمع شاخص (${summary.metricUnit})`
              : "جمع شاخص عددی"
          }
          value={summary.metricSum}
          hint={
            summary.metricCount > 0
              ? `${formatPersianNumber(summary.metricCount)} مورد دارای عدد`
              : "برای جمع دقیق، یک نوع ظرفیت فیلتر کنید"
          }
        />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <CapacityMapLeaflet points={mapPoints} />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-muted/40 text-right">
            <tr>
              <th className="p-3 font-medium">عنوان</th>
              <th className="p-3 font-medium">نوع</th>
              <th className="p-3 font-medium">جزئیات</th>
              <th className="p-3 font-medium">منبع</th>
              <th className="p-3 font-medium">دستگاه / کاربر</th>
              <th className="p-3 font-medium">استان / شهر</th>
              <th className="p-3 font-medium">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  ظرفیتی با این فیلتر یافت نشد.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const details = normalizeCapacityDetails(
                  item.capacityType,
                  item.details
                );
                const detailSummary = formatCapacityDetailsSummary(
                  item.capacityType,
                  details,
                  null
                );
                const location = [item.mapProvince ?? item.province, item.mapCity ?? item.city]
                  .filter(Boolean)
                  .join(" / ");
                return (
                  <tr key={`${item.source}-${item.id}`} className="border-t align-top">
                    <td className="p-3">{item.title}</td>
                    <td className="p-3">
                      {DEVICE_CAPACITY_TYPE_LABELS[item.capacityType]}
                    </td>
                    <td className="max-w-[280px] p-3 text-xs text-muted-foreground">
                      {detailSummary || "—"}
                    </td>
                    <td className="p-3">
                      {item.source === "device" ? "دستگاه" : "کاربر"}
                    </td>
                    <td className="p-3">
                      {item.source === "device"
                        ? item.deviceName ?? "—"
                        : item.userName ?? "—"}
                    </td>
                    <td className="p-3">{location || "—"}</td>
                    <td className="p-3">{item.isActive ? "فعال" : "غیرفعال"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{formatPersianNumber(value)}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
