import { normalizeDevicePhones } from "@/lib/device-passport-normalize";
import type { DevicePassport } from "@/lib/types";

export interface PassportCompletionItem {
  key: string;
  label: string;
  done: boolean;
}

export interface PassportCompletion {
  items: PassportCompletionItem[];
  completedCount: number;
  totalCount: number;
  percent: number;
  missingLabels: string[];
  complete: boolean;
}

/** Checklist for identity fields on the device passport page (not campaign/directive stats). */
export function computePassportCompletion(passport: DevicePassport): PassportCompletion {
  const { device, staff, capacities, users } = passport;
  const safeUsers = users ?? [];
  const safeCapacities = capacities ?? [];
  const phones = normalizeDevicePhones(device.phones);
  const hasPrimaryOfficial = safeUsers.some((user) => user.orgRole === "primary");
  const hasStaff = (staff?.length ?? 0) > 0;
  const hasCapacity = safeCapacities.some((item) => item.isActive);
  const hasPhones = phones.some((phone) => phone.trim().length > 0);
  const hasLocation = Boolean(device.province?.trim() && device.city?.trim());

  const items: PassportCompletionItem[] = [
    { key: "mission", label: "حوزه مأموریت", done: Boolean(device.mission?.trim()) },
    { key: "address", label: "آدرس", done: Boolean(device.address?.trim()) },
    { key: "phones", label: "شماره تماس", done: hasPhones },
    { key: "location", label: "استان و شهر", done: hasLocation },
    { key: "primary", label: "کاربر با سمت مدیر", done: hasPrimaryOfficial },
    { key: "staff", label: "ثبت کارکنان", done: hasStaff },
    { key: "capacity", label: "ثبت دارایی / ظرفیت", done: hasCapacity },
  ];

  const completedCount = items.filter((item) => item.done).length;
  const totalCount = items.length;
  const percent = totalCount === 0 ? 100 : Math.round((completedCount / totalCount) * 100);
  const missingLabels = items.filter((item) => !item.done).map((item) => item.label);

  return {
    items,
    completedCount,
    totalCount,
    percent,
    missingLabels,
    complete: missingLabels.length === 0,
  };
}
