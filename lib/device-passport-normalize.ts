import type { DevicePassport } from "@/lib/types";

/** Coerce unknown DB/JSON values into a stable phone list for UI + completion checks. */
export function normalizeDevicePhones(phones: unknown): string[] {
  if (Array.isArray(phones)) {
    return phones
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  if (typeof phones === "string") {
    try {
      const parsed = JSON.parse(phones) as unknown;
      return normalizeDevicePhones(parsed);
    } catch {
      return phones.trim() ? [phones.trim()] : [];
    }
  }
  return [];
}

/** Guard client render against partial or legacy passport payloads. */
export function normalizeDevicePassportForClient(passport: DevicePassport): DevicePassport {
  return {
    ...passport,
    device: {
      ...passport.device,
      phones: normalizeDevicePhones(passport.device?.phones),
    },
    ancestors: passport.ancestors ?? [],
    children: passport.children ?? [],
    officials: passport.officials ?? [],
    staff: passport.staff ?? [],
    capacities: passport.capacities ?? [],
    users: passport.users ?? [],
  };
}
