"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  ArrowRight,
  Award,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  FileStack,
  FileText,
  FormInput,
  Gauge,
  GraduationCap,
  HardDrive,
  IdCard,
  ImageIcon,
  Images,
  Globe,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  LogOut,
  Map,
  Medal,
  Menu,
  Megaphone,
  MessageSquare,
  Newspaper,
  PackageCheck,
  Radar,
  Radio,
  Rocket,
  ScrollText,
  Send,
  Settings,
  Share2,
  Shield,
  Sparkles,
  TriangleAlert,
  Users,
  UserCircle,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn, adminHref, formatPersianNumber, isSupabaseConfigured } from "@/lib/utils";
import { logoutAdminAction } from "@/lib/actions/auth-actions";
import { getSessionContextAction } from "@/lib/actions/extended-actions";
import { getMyUnreadContentMessageCountAction } from "@/lib/actions/content-message-actions";
import { countReturnedContentAction } from "@/lib/actions/content-review-actions";
import { getMyUnreadProblemReplyCountAction } from "@/lib/actions/problem-report-actions";
import { createClient } from "@/lib/supabase/client";
import { useAdminCampaign } from "@/components/admin/admin-campaign-provider";
import {
  hasContributorPermission,
  type ContributorPermissionKey,
  type ContributorPermissions,
} from "@/lib/contributor-permissions";
import { isDeviceScopedPanelRole, isOrgUserRole, isReisRole } from "@/lib/user-roles";
import { MEDIA_COMMAND_NAV } from "@/lib/media-command/labels";
import { MONITORING_NAV } from "@/lib/monitoring/labels";
import {
  CONTENT_MESSAGES_UNREAD_EVENT,
  readContentMessagesUnreadFromEvent,
} from "@/lib/content-messages-unread";
import {
  PROBLEM_REPORTS_UNREAD_EVENT,
  readUnreadCountFromEvent,
} from "@/lib/problem-reports-unread";
import { REIS_HOME_PATH } from "@/lib/reis/sections";

const PROBLEM_REPORTS_HREF = "/admin/problem-reports";
const MESSAGES_HREF = "/admin/messages";
const RETURNED_CONTENT_HREF = "/admin/returned-content";
const HOME_PASSPORT_HREF = "/admin/devices/home";

const allNavItems: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  adminOrClientOnly?: boolean;
  /** Visible to admin, client, and org users with manageSubtreeUsers. */
  usersNav?: boolean;
  /** Visible to admin and device-scoped org users with manageSubtreeDevices. */
  devicesNav?: boolean;
  /** Own-device passport — shown when the session has a home device. */
  homePassportNav?: boolean;
  /** Org-user subtree view pages (hidden from admin/client/reis). */
  orgSubtreeOnly?: boolean;
  /** Always visible for every panel user (not gated by section permissions). */
  alwaysVisible?: boolean;
  permissionKey?: ContributorPermissionKey;
}[] = [
  { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
  { href: "/admin/best-practices", label: "بهترین اقدامات", icon: Award, permissionKey: "bestPractices" },
  { href: RETURNED_CONTENT_HREF, label: "محتواهای برگشتی", icon: ClipboardCheck, alwaysVisible: true },
  { href: "/admin/president", label: "صفحه رییس‌جمهور", icon: Radar, adminOrClientOnly: true },
  { href: "/admin/my-performance", label: "گزارش عملکرد", icon: Medal, alwaysVisible: true },
  { href: "/admin/settings", label: "تنظیمات راستا", icon: Settings, permissionKey: "campaignSettings", adminOrClientOnly: true },
  { href: "/admin/capacity-map", label: "دارایی‌های دیجیتال و نقشه ظرفیت", icon: Map, adminOrClientOnly: true },
  { href: "/admin/calendar", label: "تقویم ملی", icon: CalendarDays, permissionKey: "nationalCalendar", adminOrClientOnly: true },
  { href: "/admin/taghvim", label: "تقویم دفاع و سازندگی", icon: Shield, permissionKey: "defenseCalendar", adminOrClientOnly: true },
  { href: "/admin/performance", label: "مشاهده عملکرد", icon: Medal, adminOrClientOnly: true },
  {
    href: "/admin/subordinates-performance",
    label: "گزارش عملکرد زیردستان",
    icon: Medal,
    orgSubtreeOnly: true,
    permissionKey: "viewSubtreePerformance",
  },
  {
    href: "/admin/subordinates-live-report",
    label: "گزارش زنده زیردستان",
    icon: Radio,
    orgSubtreeOnly: true,
    permissionKey: "viewSubtreeLiveReport",
  },
  { href: "/admin/scoring", label: "قوانین امتیازدهی", icon: Award, adminOrClientOnly: true },
  { href: "/admin/posting-limits", label: "محدودیت روزانه", icon: Gauge, adminOrClientOnly: true },
  { href: "/admin/tutorials", label: "آموزش بخش‌ها", icon: GraduationCap, permissionKey: "sectionTutorials", adminOnly: true },
  { href: "/admin/onboarding-steps", label: "مراحل راه‌اندازی", icon: ListChecks, adminOnly: true },
  { href: "/admin/group-edit", label: "ویرایش گروهی", icon: Layers, adminOnly: true },
  { href: "/admin/billboards", label: "تبلیغات محیطی", icon: LayoutGrid, permissionKey: "billboards" },
  { href: "/admin/ready-productions", label: "تولیدات آماده", icon: PackageCheck, alwaysVisible: true },
  { href: "/admin/posters", label: "پوستر و عکس", icon: ImageIcon, permissionKey: "posters" },
  { href: "/admin/videos", label: "ویدیوها", icon: Video, permissionKey: "videos" },
  { href: "/admin/files", label: "فایل‌ها", icon: FileStack, permissionKey: "files" },
  { href: "/admin/text-contents", label: "خبر و متن", icon: Newspaper, permissionKey: "textContents" },
  { href: "/admin/raw-media", label: "راش تصاویر", icon: HardDrive, permissionKey: "rawMedia" },
  { href: "/admin/analytics", label: "سایت‌ها", icon: Globe, permissionKey: "analytics" },
  { href: "/admin/site-publications", label: "سایت", icon: Globe, permissionKey: "sitePublications" },
  { href: "/admin/news-agencies", label: "خبرگزاری", icon: Newspaper, permissionKey: "sitePublications" },
  { href: "/admin/social-analytics", label: "شبکه‌های اجتماعی", icon: Share2, permissionKey: "socialPosts" },
  { href: "/admin/social-posts", label: "پست شبکه اجتماعی", icon: Images, permissionKey: "socialPosts" },
  { href: "/admin/press-publications", label: "مجله و روزنامه", icon: FileText, permissionKey: "activities" },
  { href: "/admin/activities", label: "اقدامات", icon: Sparkles, permissionKey: "activities" },
  { href: "/admin/elanha", label: "اعلان‌ها", icon: Bell, adminOrClientOnly: true },
  { href: MESSAGES_HREF, label: "پیام‌های من", icon: MessageSquare, alwaysVisible: true },
  { href: "/admin/directives", label: "دستورکارها", icon: ClipboardCheck, permissionKey: "directives" },
  { href: PROBLEM_REPORTS_HREF, label: "گزارش مشکل", icon: TriangleAlert, alwaysVisible: true },
  { href: "/admin/broadcast", label: "صدا و سیما", icon: Radio, permissionKey: "broadcast" },
  { href: "/admin/sms-reports", label: "ارسال پیام انبوه", icon: Send, permissionKey: "smsReports" },
  { href: "/admin/meetings", label: "جلسات و مصوبات", icon: ClipboardList, permissionKey: "meetings" },
  { href: "/admin/submissions", label: "مشارکت‌ها", icon: FileText, permissionKey: "submissions" },
  { href: "/admin/forms", label: "فرم‌ها", icon: FormInput, permissionKey: "forms", adminOrClientOnly: true },
  { href: "/admin/ministries", label: "دستگاه‌ها", icon: Building2, devicesNav: true },
  {
    href: HOME_PASSPORT_HREF,
    label: "شناسنامه دستگاه",
    icon: IdCard,
    homePassportNav: true,
  },
  { href: "/admin/users", label: "کاربران", icon: Users, usersNav: true },
  { href: "/admin/pre-registrations", label: "پیش‌ثبت‌نام‌ها", icon: UserPlus, adminOnly: true },
  { href: "/admin/updates", label: "آپدیت‌های سایت", icon: Rocket, permissionKey: "siteUpdates", adminOrClientOnly: true },
  { href: "/admin/backups", label: "پشتیبان‌گیری", icon: Archive, adminOnly: true },
  { href: "/admin/reported-problems", label: "مشکلات ثبت‌شده", icon: TriangleAlert, adminOnly: true },
  { href: "/admin/audit", label: "رصد کاربران", icon: ScrollText, adminOnly: true },
  // Keep last in «تنظیمات و مدیریت» so it does not sit above operational links.
  { href: "/admin/profile", label: "پروفایل من", icon: UserCircle },
];

const MEDIA_COMMAND_ROOT = "/admin/media-command";
const MONITORING_ROOT = "/admin/monitoring";
const RAPID_RESPONSE_ROOT = "/admin/rapid-response";

const managementNavHrefs = new Set([
  "/admin/profile",
  "/admin/my-performance",
  "/admin/ministries",
  HOME_PASSPORT_HREF,
  "/admin/users",
  "/admin/pre-registrations",
  "/admin/group-edit",
  "/admin/audit",
  "/admin/settings",
  "/admin/calendar",
  "/admin/taghvim",
  "/admin/performance",
  "/admin/subordinates-performance",
  "/admin/subordinates-live-report",
  "/admin/scoring",
  "/admin/posting-limits",
  "/admin/tutorials",
  "/admin/onboarding-steps",
  "/admin/elanha",
  "/admin/updates",
  "/admin/forms",
  "/admin/backups",
  MESSAGES_HREF,
  PROBLEM_REPORTS_HREF,
  "/admin/reported-problems",
]);

const DIRECTIVES_HREF = "/admin/directives";
/** Ordered list for the assets group (menu display order). */
const ASSETS_GROUP_ORDER = [
  "/admin/capacity-map",
  "/admin/analytics",
  "/admin/social-analytics",
] as const;
const ASSETS_GROUP_HREFS = new Set<string>(ASSETS_GROUP_ORDER);
const PRODUCTION_GROUP_HREFS = new Set([
  "/admin/ready-productions",
  "/admin/posters",
  "/admin/videos",
  "/admin/files",
  "/admin/text-contents",
  "/admin/raw-media",
  "/admin/meetings",
]);
/** Ordered list for the publishing group (menu display order). */
const PUBLISHING_GROUP_ORDER = [
  "/admin/billboards",
  "/admin/social-posts",
  "/admin/site-publications",
  "/admin/news-agencies",
  "/admin/broadcast",
  "/admin/press-publications",
  "/admin/activities",
  "/admin/sms-reports",
  "/admin/submissions",
] as const;
const PUBLISHING_GROUP_HREFS = new Set<string>(PUBLISHING_GROUP_ORDER);

/** Survives remounts so the right-side menu keeps its scroll after navigation. */
let savedSidebarScrollTop = 0;

type SidebarSection =
  | "production"
  | "publishing"
  | "assets"
  | "monitoring"
  | "mediaCommand";

type AdminSidebarProps = {
  /** When reis is in full-panel mode via «تنظیمات», show a link back to the hub. */
  showReisReturn?: boolean;
};

export function AdminSidebar({ showReisReturn = false }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFullAdminUser, setIsFullAdminUser] = useState(false);
  const [isClientRole, setIsClientRole] = useState(false);
  const [isReisPanelUser, setIsReisPanelUser] = useState(false);
  const [canViewUsersNav, setCanViewUsersNav] = useState(false);
  const [canViewSubtreePerformanceNav, setCanViewSubtreePerformanceNav] = useState(false);
  const [canViewDevicesNav, setCanViewDevicesNav] = useState(false);
  const [homeDeviceId, setHomeDeviceId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<ContributorPermissions | null>(null);
  // Collapsed by default; pathname effect opens the active group (accordion: one at a time).
  const [openSection, setOpenSection] = useState<SidebarSection | null>(null);

  const toggleSection = (section: SidebarSection) => {
    setOpenSection((current) => (current === section ? null : section));
  };
  const [problemReportsUnread, setProblemReportsUnread] = useState(0);
  const [contentMessagesUnread, setContentMessagesUnread] = useState(0);
  const [returnedContentCount, setReturnedContentCount] = useState(0);
  const desktopNavRef = useRef<HTMLElement>(null);
  const { campaignId, campaigns, currentCampaign, setCampaignId } = useAdminCampaign();

  // Reis in panel mode sees the same content/management nav as client.
  const seesAllCampaignSections = isFullAdminUser || isClientRole || isReisPanelUser;

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      getMyUnreadProblemReplyCountAction()
        .then((result) => {
          if (!cancelled && result.success) setProblemReportsUnread(result.count ?? 0);
        })
        .catch(() => {});
      getMyUnreadContentMessageCountAction()
        .then((result) => {
          if (!cancelled && result.success) setContentMessagesUnread(result.count ?? 0);
        })
        .catch(() => {});
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    const onProblemUnreadEvent = (event: Event) => {
      const count = readUnreadCountFromEvent(event);
      if (count !== null) setProblemReportsUnread(count);
    };
    const onMessagesUnreadEvent = (event: Event) => {
      const count = readContentMessagesUnreadFromEvent(event);
      if (count !== null) setContentMessagesUnread(count);
    };
    window.addEventListener(PROBLEM_REPORTS_UNREAD_EVENT, onProblemUnreadEvent);
    window.addEventListener(CONTENT_MESSAGES_UNREAD_EVENT, onMessagesUnreadEvent);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(PROBLEM_REPORTS_UNREAD_EVENT, onProblemUnreadEvent);
      window.removeEventListener(CONTENT_MESSAGES_UNREAD_EVENT, onMessagesUnreadEvent);
    };
  }, []);

  useEffect(() => {
    if (!campaignId) {
      setReturnedContentCount(0);
      return;
    }
    let cancelled = false;
    const refresh = () => {
      countReturnedContentAction({ campaignId })
        .then((result) => {
          if (!cancelled && result.success) setReturnedContentCount(result.count ?? 0);
        })
        .catch(() => {});
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;
    const loadSession = () => {
      getSessionContextAction(campaignId)
        .then((session) => {
          if (cancelled || !session) return;
          const fullAdmin = session.type === "env_admin" || session.role === "admin";
          const clientRole = session.role === "client";
          const reisRole = isReisRole(session.role);
          setIsFullAdminUser(fullAdmin);
          setIsClientRole(clientRole);
          setIsReisPanelUser(reisRole);
          const perms = session.permissions ?? null;
          // Prefer active-campaign flags; fall back to session OR-flag when unset.
          setCanViewUsersNav(
            isOrgUserRole(session.role) &&
              (perms
                ? hasContributorPermission(perms, "manageSubtreeUsers")
                : session.manageSubtreeUsers === true)
          );
          setCanViewSubtreePerformanceNav(
            isOrgUserRole(session.role) &&
              (perms
                ? hasContributorPermission(perms, "viewSubtreePerformance")
                : session.viewSubtreePerformance === true)
          );
          setCanViewDevicesNav(
            isDeviceScopedPanelRole(session.role) &&
              (perms
                ? hasContributorPermission(perms, "manageSubtreeDevices")
                : session.manageSubtreeDevices === true)
          );
          setHomeDeviceId(
            typeof session.homeDeviceId === "string" && session.homeDeviceId.trim()
              ? session.homeDeviceId.trim()
              : null
          );
          setPermissions(perms);
        })
        .catch((error) => {
          console.error("[admin-sidebar] failed to load session context", error);
        });
    };
    loadSession();
    const onFocus = () => loadSession();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [campaignId]);

  useEffect(() => {
    if (pathname.startsWith(MEDIA_COMMAND_ROOT)) {
      setOpenSection("mediaCommand");
    } else if (pathname.startsWith(MONITORING_ROOT) || pathname.startsWith(RAPID_RESPONSE_ROOT)) {
      setOpenSection("monitoring");
    } else if (ASSETS_GROUP_HREFS.has(pathname)) {
      setOpenSection("assets");
    } else if (PRODUCTION_GROUP_HREFS.has(pathname)) {
      setOpenSection("production");
    } else if (PUBLISHING_GROUP_HREFS.has(pathname)) {
      setOpenSection("publishing");
    }
  }, [pathname]);

  useEffect(() => {
    const el = desktopNavRef.current;
    if (!el) return;
    const onScroll = () => {
      savedSidebarScrollTop = el.scrollTop;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    const el = desktopNavRef.current;
    if (el) el.scrollTop = savedSidebarScrollTop;
  }, [pathname, openSection]);

  const navItems = allNavItems.filter((item) => {
    // Hide returned-content until there is at least one item in the user's scope.
    if (item.href === RETURNED_CONTENT_HREF && returnedContentCount <= 0) return false;
    if (item.homePassportNav) return Boolean(homeDeviceId);
    if (item.alwaysVisible) return true;
    if (item.usersNav) {
      return seesAllCampaignSections || canViewUsersNav;
    }
    if (item.devicesNav) {
      return isFullAdminUser || isClientRole || canViewDevicesNav;
    }
    // Subordinates-only views: never for admin/client/reis; need explicit grant.
    if (item.orgSubtreeOnly) {
      if (seesAllCampaignSections) return false;
      if (!item.permissionKey) return false;
      if (item.permissionKey === "viewSubtreePerformance") {
        return canViewSubtreePerformanceNav;
      }
      return hasContributorPermission(permissions, item.permissionKey);
    }
    // Panel management items: admin/client/reis always, or org_user with explicit grant.
    if (item.adminOrClientOnly) {
      if (seesAllCampaignSections) return true;
      if (item.permissionKey) {
        return hasContributorPermission(permissions, item.permissionKey);
      }
      return false;
    }
    // Admin, client, and reis see all content sections.
    if (seesAllCampaignSections) return true;
    // Admin-only items may still be granted via permission (e.g. section tutorials).
    if (item.adminOnly) {
      if (!item.permissionKey) return false;
      return hasContributorPermission(permissions, item.permissionKey);
    }
    if (!item.permissionKey) return true;
    return hasContributorPermission(permissions, item.permissionKey);
  });

  const showMediaCommand =
    seesAllCampaignSections || hasContributorPermission(permissions, "mediaCommand");
  const showMonitoring =
    seesAllCampaignSections || hasContributorPermission(permissions, "monitoring");

  /** Pin directives as a red alert CTA when the user has directives access. */
  const showDirectivesAlert =
    seesAllCampaignSections || hasContributorPermission(permissions, "directives");
  const directivesNavItem = navItems.find((item) => item.href === DIRECTIVES_HREF);
  const contentNavItems = navItems.filter((item) => {
    if (managementNavHrefs.has(item.href)) return false;
    if (showDirectivesAlert && item.href === DIRECTIVES_HREF) return false;
    return true;
  });
  const managementNavItems = navItems.filter((item) => managementNavHrefs.has(item.href));
  const assetsNavItems = ASSETS_GROUP_ORDER.map((href) =>
    contentNavItems.find((item) => item.href === href)
  ).filter((item): item is (typeof contentNavItems)[number] => Boolean(item));
  const productionNavItems = contentNavItems.filter((item) => PRODUCTION_GROUP_HREFS.has(item.href));
  const publishingNavItems = PUBLISHING_GROUP_ORDER.map((href) =>
    contentNavItems.find((item) => item.href === href)
  ).filter((item): item is (typeof contentNavItems)[number] => Boolean(item));
  const ungroupedContentNavItems = contentNavItems.filter(
    (item) =>
      !ASSETS_GROUP_HREFS.has(item.href) &&
      !PRODUCTION_GROUP_HREFS.has(item.href) &&
      !PUBLISHING_GROUP_HREFS.has(item.href)
  );

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) await supabase.auth.signOut();
    } else {
      await logoutAdminAction();
    }
    router.push("/admin/login");
    router.refresh();
  };

  // Render helper (not a nested component) so the <nav> DOM is not remounted on route changes.
  const renderNavContent = (navRef?: RefObject<HTMLElement | null>) => (
    <>
      <div className="p-4 border-b space-y-3">
        <Link href="/admin" className="font-bold text-lg block">پنل مدیریت</Link>
        {campaigns.length === 1 && (
          <p className="text-sm font-medium truncate" title={campaigns[0].title}>
            {campaigns[0].title}
          </p>
        )}
        {campaigns.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">راستا فعال</p>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="انتخاب راستا" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <nav ref={navRef} className="flex-1 overflow-y-auto p-3">
        {showDirectivesAlert && directivesNavItem && (
          <div className="mb-3">
            <Link
              href={adminHref(DIRECTIVES_HREF, campaignId)}
              prefetch={false}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-extrabold tracking-wide",
                "bg-red-600 text-white shadow-lg shadow-red-600/40",
                "ring-2 ring-red-400/70 hover:bg-red-700 hover:shadow-red-700/50",
                "transition-colors",
                pathname === DIRECTIVES_HREF && "ring-4 ring-white/70"
              )}
            >
              <ClipboardCheck className="h-5 w-5 shrink-0" />
              <span>دستورکارها</span>
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {ungroupedContentNavItems.map((item) => {
            const Icon = item.icon;
            const href = adminHref(item.href, campaignId);
            const isActive =
              pathname === item.href || (item.href === "/admin/elanha" && pathname === "/admin/notifications");
            return (
              <Link
                key={item.href}
                href={href}
                prefetch={false}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "apple-nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1">{item.label}</span>
                {item.href === RETURNED_CONTENT_HREF && returnedContentCount > 0 && (
                  <span
                    className="ms-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
                    title={`${formatPersianNumber(returnedContentCount)} برگشتی`}
                    aria-label={`${formatPersianNumber(returnedContentCount)} محتوای برگشتی`}
                  >
                    {formatPersianNumber(returnedContentCount)}
                  </span>
                )}
                {item.href === PROBLEM_REPORTS_HREF && problemReportsUnread > 0 && (
                  <span
                    className="ms-auto h-2.5 w-2.5 shrink-0 rounded-full bg-red-500"
                    title="پاسخ خوانده‌نشده"
                    aria-label="پاسخ خوانده‌نشده"
                  />
                )}
                {item.href === MESSAGES_HREF && contentMessagesUnread > 0 && (
                  <span
                    className="ms-auto h-2.5 w-2.5 shrink-0 rounded-full bg-red-500"
                    title="پیام خوانده‌نشده"
                    aria-label="پیام خوانده‌نشده"
                  />
                )}
              </Link>
            );
          })}
        </div>

        {productionNavItems.length > 0 && (
          <div className="mt-3 space-y-1 border-t pt-3">
            <button
              type="button"
              onClick={() => toggleSection("production")}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                productionNavItems.some((item) => pathname === item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <ImageIcon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-right">تولید</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform",
                  openSection === "production" && "rotate-180"
                )}
              />
            </button>
            {openSection === "production" && (
              <div className="space-y-0.5 pr-2">
                {productionNavItems.map((item) => {
                  const href = adminHref(item.href, campaignId);
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      prefetch={false}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {publishingNavItems.length > 0 && (
          <div className="mt-3 space-y-1 border-t pt-3">
            <button
              type="button"
              onClick={() => toggleSection("publishing")}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                publishingNavItems.some((item) => pathname === item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Send className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-right">نشر و انتشار</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform",
                  openSection === "publishing" && "rotate-180"
                )}
              />
            </button>
            {openSection === "publishing" && (
              <div className="space-y-0.5 pr-2">
                {publishingNavItems.map((item) => {
                  const href = adminHref(item.href, campaignId);
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      prefetch={false}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {assetsNavItems.length > 0 && (
          <div className="mt-3 space-y-1 border-t pt-3">
            <button
              type="button"
              onClick={() => toggleSection("assets")}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                assetsNavItems.some((item) => pathname === item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-right">دارایی‌های دیجیتال</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform",
                  openSection === "assets" && "rotate-180"
                )}
              />
            </button>
            {openSection === "assets" && (
              <div className="space-y-0.5 pr-2">
                {assetsNavItems.map((item) => {
                  const href = adminHref(item.href, campaignId);
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      prefetch={false}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {showMonitoring && (
          <div className="mt-3 space-y-1 border-t pt-3">
            <button
              type="button"
              onClick={() => toggleSection("monitoring")}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                pathname.startsWith(MONITORING_ROOT) || pathname.startsWith(RAPID_RESPONSE_ROOT)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Radar className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-right">رصد و واکنش سریع</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform",
                  openSection === "monitoring" && "rotate-180"
                )}
              />
            </button>
            {openSection === "monitoring" && (
              <div className="space-y-0.5 pr-2">
                {MONITORING_NAV.map((item) => {
                  const href = adminHref(item.href, campaignId);
                  const isActive =
                    "exact" in item && item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      prefetch={false}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "block rounded-lg px-3 py-1.5 text-xs",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {showMediaCommand && (
          <div className="mt-3 space-y-1 border-t pt-3">
            <button
              type="button"
              onClick={() => toggleSection("mediaCommand")}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                pathname.startsWith(MEDIA_COMMAND_ROOT)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Megaphone className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-right">میز فرمان رسانه‌ای</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform",
                  openSection === "mediaCommand" && "rotate-180"
                )}
              />
            </button>
            {openSection === "mediaCommand" && (
              <div className="space-y-0.5 pr-2">
                {MEDIA_COMMAND_NAV.map((item) => {
                  const href = adminHref(item.href, campaignId);
                  const isActive =
                    "exact" in item && item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      prefetch={false}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "block rounded-lg px-3 py-1.5 text-xs",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {managementNavItems.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <p className="px-3 pb-2 text-xs font-medium text-muted-foreground">تنظیمات و مدیریت</p>
            <div className="space-y-1">
              {managementNavItems.map((item) => {
                const Icon = item.icon;
                const href = adminHref(item.href, campaignId);
                const isActive =
                  pathname === item.href ||
                  (item.href === HOME_PASSPORT_HREF &&
                    Boolean(homeDeviceId) &&
                    pathname === `/admin/devices/${homeDeviceId}`) ||
                  (item.href === "/admin/elanha" && pathname === "/admin/notifications");
                return (
                  <Link
                    key={item.href}
                    href={href}
                    prefetch={false}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "apple-nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">{item.label}</span>
                    {item.href === PROBLEM_REPORTS_HREF && problemReportsUnread > 0 && (
                      <span
                        className="ms-auto h-2.5 w-2.5 shrink-0 rounded-full bg-red-500"
                        title="پاسخ خوانده‌نشده"
                        aria-label="پاسخ خوانده‌نشده"
                      />
                    )}
                    {item.href === MESSAGES_HREF && contentMessagesUnread > 0 && (
                      <span
                        className="ms-auto h-2.5 w-2.5 shrink-0 rounded-full bg-red-500"
                        title="پیام خوانده‌نشده"
                        aria-label="پیام خوانده‌نشده"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>
      <div className="p-3 border-t space-y-2">
        {showReisReturn ? (
          <Link href={REIS_HOME_PATH}>
            <Button variant="outline" size="sm" className="w-full gap-1.5">
              <ArrowRight className="h-4 w-4" />
              بازگشت به بخش‌ها
            </Button>
          </Link>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">تم</span>
          <ThemeToggle />
        </div>
        {isFullAdminUser && currentCampaign && (
          <Link href={`/campaign/${currentCampaign.slug}`} target="_blank">
            <Button variant="outline" size="sm" className="w-full">
              مشاهده صفحه عمومی
            </Button>
          </Link>
        )}
        <Button variant="ghost" size="sm" className="w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          خروج
        </Button>
      </div>
    </>
  );

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed right-4 top-4 z-[80] md:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {mobileOpen && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute right-0 top-0 flex h-full w-[min(18rem,88vw)] flex-col border-l bg-card">
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-2"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            {renderNavContent()}
          </aside>
        </div>
      )}

      {/* md+: persistent sidebar for tablet / iPad / laptop; slightly narrower until lg */}
      <aside className="hidden md:fixed md:inset-y-0 md:right-0 md:z-[80] md:flex md:w-56 md:flex-col border-l bg-card lg:w-64">
        {renderNavContent(desktopNavRef)}
      </aside>
    </>
  );
}
