export const REIS_HOME_PATH = "/admin/reis";

export const REIS_SECTION_KEYS = [
  "campaigns",
  "strategic",
  "monitoring",
  "defense-calendar",
  "education",
  "meetings",
  "narrative",
] as const;

export type ReisSectionKey = (typeof REIS_SECTION_KEYS)[number];

export type ReisSection = {
  key: ReisSectionKey;
  title: string;
  description: string;
  /** Internal path under /admin/reis, or absolute external URL. */
  href: string;
  external?: boolean;
  accent: string;
  iconBg: string;
};

export const REIS_SECTIONS: ReisSection[] = [
  {
    key: "campaigns",
    title: "کمپین‌ها و گزارش کارها",
    description: "مشاهده کمپین‌ها، عملکرد و گزارش‌های اجرایی",
    href: `${REIS_HOME_PATH}/campaigns`,
    accent: "from-sky-500/20 to-blue-600/10",
    iconBg: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  {
    key: "strategic",
    title: "ارتباطات راهبردی",
    description: "دستورکارها و پیگیری اجرای دستورکارها",
    href: `${REIS_HOME_PATH}/strategic`,
    accent: "from-indigo-500/20 to-violet-600/10",
    iconBg: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  },
  {
    key: "monitoring",
    title: "رصد و واکنش سریع",
    description: "رصد فضای رسانه‌ای، پرونده‌ها و پیگیری اقدام‌های در حال اجرا",
    href: `${REIS_HOME_PATH}/monitoring`,
    accent: "from-emerald-500/20 to-teal-600/10",
    iconBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  {
    key: "defense-calendar",
    title: "تقویم دفاع و سازندگی",
    description: "ورود به سامانه تقویم دفاع",
    href: "/admin/taghvim",
    accent: "from-amber-500/20 to-orange-600/10",
    iconBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  {
    key: "education",
    title: "آموزش",
    description: "محتوای آموزشی و راهنماهای بخش‌ها",
    href: `${REIS_HOME_PATH}/education`,
    accent: "from-rose-500/20 to-pink-600/10",
    iconBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  {
    key: "meetings",
    title: "اتاق جلسات",
    description: "جلسات، مصوبات و پیگیری تصمیم‌ها",
    href: `${REIS_HOME_PATH}/meetings`,
    accent: "from-cyan-500/20 to-blue-600/10",
    iconBg: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  },
  {
    key: "narrative",
    title: "اتاق روایت",
    description: "مدیریت و هدایت روایت رسمی",
    href: `${REIS_HOME_PATH}/narrative`,
    accent: "from-fuchsia-500/20 to-purple-600/10",
    iconBg: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  },
];

export function isReisSectionKey(value: string): value is ReisSectionKey {
  return (REIS_SECTION_KEYS as readonly string[]).includes(value);
}

export function getReisSection(key: string): ReisSection | undefined {
  return REIS_SECTIONS.find((section) => section.key === key);
}

/** Paths the reis role may access inside /admin. */
export function isReisAllowedPath(pathname: string): boolean {
  if (pathname === REIS_HOME_PATH || pathname.startsWith(`${REIS_HOME_PATH}/`)) {
    return true;
  }
  // Ops-room / tracking deep-links from strategic communications.
  if (pathname === "/admin/directives" || pathname.startsWith("/admin/directives/")) {
    return true;
  }
  // Monitoring & rapid-response surfaces linked from رصد و واکنش سریع.
  if (pathname === "/admin/monitoring" || pathname.startsWith("/admin/monitoring/")) {
    return true;
  }
  if (pathname === "/admin/rapid-response" || pathname.startsWith("/admin/rapid-response/")) {
    return true;
  }
  if (pathname === "/admin/taghvim" || pathname.startsWith("/admin/taghvim/")) {
    return true;
  }
  if (pathname === "/admin/profile" || pathname.startsWith("/admin/profile/")) {
    return true;
  }
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return true;
  }
  return false;
}
