import type { AgencyInput, GovernmentAgency } from "@taghvim/types/agency";

const AGENCIES_KEY = "taghvim_agencies";
const AGENCIES_VERSION_KEY = "taghvim_agencies_version";
export const AGENCIES_SEED_VERSION = "agencies-v1";

const SEED_AGENCIES: GovernmentAgency[] = [
  {
    id: "agency-health",
    name: "وزارت بهداشت، درمان و آموزش پزشکی",
    slug: "health",
    shortName: "بهداشت و درمان",
    description:
      "رصد تهدیدات زیستی/درمانی دشمن و ثبت اقدامات دفاعی، امدادی و مستقل حوزه سلامت.",
    isActive: true,
    sortOrder: 10,
    createdAt: "2026-02-28T00:00:00.000Z",
    updatedAt: "2026-02-28T00:00:00.000Z",
  },
  {
    id: "agency-defense",
    name: "ستاد کل نیروهای مسلح / وزارت دفاع",
    slug: "defense",
    shortName: "دفاع و نیروهای مسلح",
    description:
      "اقدامات نظامی دشمن، پدافند، پاسخ عملیاتی و آماده‌باش نیروهای مسلح.",
    isActive: true,
    sortOrder: 20,
    createdAt: "2026-02-28T00:00:00.000Z",
    updatedAt: "2026-02-28T00:00:00.000Z",
  },
  {
    id: "agency-mfa",
    name: "وزارت امور خارجه",
    slug: "mfa",
    shortName: "امور خارجه",
    description: "دیپلماسی، محکومیت‌ها، مذاکرات و رایزنی‌های منطقه‌ای و بین‌المللی.",
    isActive: true,
    sortOrder: 30,
    createdAt: "2026-02-28T00:00:00.000Z",
    updatedAt: "2026-02-28T00:00:00.000Z",
  },
  {
    id: "agency-oil",
    name: "وزارت نفت",
    slug: "oil",
    shortName: "نفت و انرژی",
    description: "تهدیدات انرژی، حفاظت تأسیسات نفتی و مدیریت مسیرهای صادرات.",
    isActive: true,
    sortOrder: 40,
    createdAt: "2026-02-28T00:00:00.000Z",
    updatedAt: "2026-02-28T00:00:00.000Z",
  },
  {
    id: "agency-ict",
    name: "وزارت ارتباطات و فناوری اطلاعات",
    slug: "ict",
    shortName: "ارتباطات و فناوری",
    description: "حملات سایبری دشمن و اقدامات دفاع سایبری و بازیابی سرویس‌ها.",
    isActive: true,
    sortOrder: 50,
    createdAt: "2026-02-28T00:00:00.000Z",
    updatedAt: "2026-02-28T00:00:00.000Z",
  },
  {
    id: "agency-interior",
    name: "وزارت کشور",
    slug: "interior",
    shortName: "کشور",
    description: "امنیت داخلی، مدیریت بحران استانی و هماهنگی استانداری‌ها.",
    isActive: true,
    sortOrder: 60,
    createdAt: "2026-02-28T00:00:00.000Z",
    updatedAt: "2026-02-28T00:00:00.000Z",
  },
  {
    id: "agency-intel",
    name: "وزارت اطلاعات",
    slug: "intelligence",
    shortName: "اطلاعات",
    description: "عملیات اطلاعاتی دشمن و اقدامات مقابله‌ای و رصد امنیتی.",
    isActive: true,
    sortOrder: 70,
    createdAt: "2026-02-28T00:00:00.000Z",
    updatedAt: "2026-02-28T00:00:00.000Z",
  },
  {
    id: "agency-roads",
    name: "وزارت راه و شهرسازی",
    slug: "roads",
    shortName: "راه و شهرسازی",
    description: "تهدید زیرساخت حمل‌ونقل و اقدامات ایمن‌سازی مسیرها و بنادر.",
    isActive: true,
    sortOrder: 80,
    createdAt: "2026-02-28T00:00:00.000Z",
    updatedAt: "2026-02-28T00:00:00.000Z",
  },
];

function canUseStorage() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "")
    .slice(0, 48);
}

function sortAgencies(list: GovernmentAgency[]): GovernmentAgency[] {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "fa"));
}

function writeSeed(): GovernmentAgency[] {
  writeJson(AGENCIES_KEY, SEED_AGENCIES);
  if (canUseStorage()) {
    localStorage.setItem(AGENCIES_VERSION_KEY, AGENCIES_SEED_VERSION);
  }
  return SEED_AGENCIES;
}

export function ensureAgencies(): GovernmentAgency[] {
  if (!canUseStorage()) return SEED_AGENCIES;

  const version = localStorage.getItem(AGENCIES_VERSION_KEY);
  const existing = readJson<GovernmentAgency[] | null>(AGENCIES_KEY, null);

  if (version !== AGENCIES_SEED_VERSION || !existing?.length) {
    return writeSeed();
  }

  return sortAgencies(existing);
}

export function listAgencies(options?: {
  activeOnly?: boolean;
}): GovernmentAgency[] {
  const list = ensureAgencies();
  if (options?.activeOnly) return list.filter((a) => a.isActive);
  return list;
}

export function getAgencyById(id: string): GovernmentAgency | undefined {
  return ensureAgencies().find((a) => a.id === id);
}

export function getAgenciesByIds(ids: string[]): GovernmentAgency[] {
  const set = new Set(ids);
  return listAgencies().filter((a) => set.has(a.id));
}

export function createAgency(input: AgencyInput): GovernmentAgency {
  const agencies = ensureAgencies();
  const name = input.name.trim();
  if (!name) throw new Error("نام وزارتخانه الزامی است.");

  if (agencies.some((a) => a.name === name)) {
    throw new Error("این وزارتخانه قبلاً ثبت شده است.");
  }

  const now = new Date().toISOString();
  const agency: GovernmentAgency = {
    id: `agency-${Date.now()}`,
    name,
    slug: slugify(input.shortName || name) || `agency-${Date.now()}`,
    shortName: input.shortName.trim() || name,
    description: input.description?.trim() ?? "",
    isActive: input.isActive ?? true,
    sortOrder: input.sortOrder ?? (agencies.length + 1) * 10,
    createdAt: now,
    updatedAt: now,
  };

  writeJson(AGENCIES_KEY, sortAgencies([...agencies, agency]));
  return agency;
}

export function updateAgency(
  id: string,
  patch: Partial<AgencyInput>,
): GovernmentAgency {
  const agencies = ensureAgencies();
  const index = agencies.findIndex((a) => a.id === id);
  if (index < 0) throw new Error("وزارتخانه پیدا نشد.");

  const nextName = patch.name?.trim();
  if (
    nextName &&
    agencies.some((a) => a.id !== id && a.name === nextName)
  ) {
    throw new Error("این نام قبلاً استفاده شده است.");
  }

  const current = agencies[index]!;
  const next: GovernmentAgency = {
    ...current,
    name: nextName ?? current.name,
    shortName: patch.shortName?.trim() ?? current.shortName,
    description:
      patch.description !== undefined
        ? patch.description.trim()
        : current.description,
    isActive: patch.isActive ?? current.isActive,
    sortOrder: patch.sortOrder ?? current.sortOrder,
    updatedAt: new Date().toISOString(),
  };

  agencies[index] = next;
  writeJson(AGENCIES_KEY, sortAgencies(agencies));
  return next;
}

export function deleteAgency(id: string) {
  const next = ensureAgencies().filter((a) => a.id !== id);
  writeJson(AGENCIES_KEY, next);
}

export function restoreSeedAgencies(): GovernmentAgency[] {
  return writeSeed();
}
