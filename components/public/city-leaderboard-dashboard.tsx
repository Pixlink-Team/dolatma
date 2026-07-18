"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  Landmark,
  MapPin,
  Medal,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { SectionHeader } from "@/components/public/section-header";
import { LeaderboardBillboardsModal } from "@/components/public/leaderboard-billboards-modal";
import { UserContentScoreModal } from "@/components/public/user-content-score-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollToTopButton } from "@/components/ui/scroll-to-top-button";
import {
  buildMinistryContributorLeaderboard,
  buildMinistryLeaderboard,
  buildOrganizationLeaderboard,
  buildProvinceContributorLeaderboard,
  buildProvinceLeaderboard,
  buildUserLeaderboard,
  buildUserRatingLeaderboard,
  collectLeaderboardBillboards,
  collectUserContentItems,
  getProvinceRankBadge,
  type MinistryLeaderboardEntry,
  type OrganizationLeaderboardEntry,
  type ProvinceLeaderboardEntry,
  type ProvinceLeaderboardMetrics,
  type UserLeaderboardEntry,
} from "@/lib/city-leaderboard";
import type { PublicCampaignData } from "@/lib/types";
import { formatPersianDate, formatPersianNumber } from "@/lib/utils";

type LeaderboardView = "ministry" | "organization" | "user" | "rating" | "province";

interface CityLeaderboardDashboardProps {
  data: PublicCampaignData;
  slug: string;
}

const SECTION_HREF_BY_METRIC_LABEL: Record<string, string> = {
  پوستر: "posters",
  ویدیو: "videos",
  "شبکه اجتماعی": "social-posts",
  "انتشار سایت": "site-publications",
  اقدام: "activities",
  فایل: "files",
};

const BILLBOARD_METRIC_LABELS = new Set(["تبلیغات محیطی", "متراژ"]);

interface BillboardModalScope {
  title: string;
  provinceKey?: string;
  ministryKey?: string;
  organizationKey?: string;
  userKey?: string;
}

function MetricsBreakdown({
  entry,
  slug,
  onOpenBillboards,
}: {
  entry: ProvinceLeaderboardMetrics;
  slug: string;
  onOpenBillboards?: () => void;
}) {
  const items = [
    { label: "تبلیغات محیطی", value: entry.billboards },
    { label: "متراژ", value: entry.totalAreaSqm },
    { label: "پوستر", value: entry.posters },
    { label: "ویدیو", value: entry.videos },
    { label: "شبکه اجتماعی", value: entry.socialPosts },
    { label: "انتشار سایت", value: entry.sitePublications },
    { label: "اقدام", value: entry.activities },
    { label: "فایل", value: entry.files },
  ].filter((item) => item.value > 0);

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const label = `${item.label}: ${formatPersianNumber(item.value)}`;

        if (BILLBOARD_METRIC_LABELS.has(item.label) && onOpenBillboards) {
          return (
            <button
              key={item.label}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenBillboards();
              }}
              className="inline-flex"
            >
              <Badge
                variant="outline"
                className="cursor-pointer text-[11px] hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10 hover:text-primary hover:shadow-sm"
              >
                {label}
              </Badge>
            </button>
          );
        }

        const sectionId = SECTION_HREF_BY_METRIC_LABEL[item.label];
        if (!sectionId) {
          return (
            <Badge key={item.label} variant="outline" className="text-[11px]">
              {label}
            </Badge>
          );
        }

        return (
          <Link
            key={item.label}
            href={`/campaign/${slug}#${sectionId}`}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex"
          >
            <Badge
              variant="outline"
              className="cursor-pointer text-[11px] hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10 hover:text-primary hover:shadow-sm"
            >
              {label}
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}

function NamedPodiumCard({
  entry,
  title,
  subtitle,
}: {
  entry: ProvinceLeaderboardMetrics & { rank: number };
  title: string;
  subtitle?: string;
}) {
  const heightClass =
    entry.rank === 1 ? "min-h-[220px]" : entry.rank === 2 ? "min-h-[190px]" : "min-h-[170px]";

  return (
    <Card className={`${heightClass} flex flex-col justify-end border-primary/20 bg-gradient-to-b from-primary/5 to-card`}>
      <CardContent className="space-y-3 p-5 text-center">
        <div className="text-3xl">{getProvinceRankBadge(entry.rank)}</div>
        <p className="font-bold">{title}</p>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="secondary">{formatPersianNumber(entry.score)} امتیاز</Badge>
          <Badge variant="outline">{formatPersianNumber(entry.totalUploads)} محتوا</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function UserPodiumCard({
  entry,
  showRating = false,
}: {
  entry: UserLeaderboardEntry;
  showRating?: boolean;
}) {
  const heightClass =
    entry.rank === 1 ? "min-h-[220px]" : entry.rank === 2 ? "min-h-[190px]" : "min-h-[170px]";
  const scoreValue = showRating ? entry.ratingScore : entry.score;

  return (
    <Card className={`${heightClass} flex flex-col justify-end border-primary/20 bg-gradient-to-b from-primary/5 to-card`}>
      <CardContent className="space-y-3 p-5 text-center">
        <div className="text-3xl">{getProvinceRankBadge(entry.rank)}</div>
        <p className="font-bold">{entry.userName}</p>
        <p className="text-xs text-muted-foreground">{entry.ministry}</p>
        {entry.province && entry.province !== "نامشخص" ? (
          <p className="text-[11px] text-muted-foreground/80">{entry.province}</p>
        ) : null}
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="secondary">{formatPersianNumber(scoreValue)} امتیاز</Badge>
          <Badge variant="outline">{formatPersianNumber(entry.totalUploads)} محتوا</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function LeaderboardViewToggle({
  view,
  onChange,
}: {
  view: LeaderboardView;
  onChange: (view: LeaderboardView) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant={view === "ministry" ? "default" : "outline"}
        onClick={() => onChange("ministry")}
      >
        <Landmark className="h-4 w-4" />
        بر اساس وزارتخانه
      </Button>
      <Button
        type="button"
        size="sm"
        variant={view === "organization" ? "default" : "outline"}
        onClick={() => onChange("organization")}
      >
        <Building2 className="h-4 w-4" />
        بر اساس زیرمجموعه
      </Button>
      <Button
        type="button"
        size="sm"
        variant={view === "user" ? "default" : "outline"}
        onClick={() => onChange("user")}
      >
        <Users className="h-4 w-4" />
        بر اساس کاربر
      </Button>
      <Button
        type="button"
        size="sm"
        variant={view === "rating" ? "default" : "outline"}
        onClick={() => onChange("rating")}
      >
        <Star className="h-4 w-4" />
        بر اساس امتیاز
      </Button>
      <Button
        type="button"
        size="sm"
        variant={view === "province" ? "default" : "outline"}
        onClick={() => onChange("province")}
      >
        <MapPin className="h-4 w-4" />
        بر اساس استان
      </Button>
    </div>
  );
}

function getViewTitle(view: LeaderboardView): string {
  switch (view) {
    case "ministry":
      return "رتبه‌بندی وزارتخانه‌ها";
    case "organization":
      return "رتبه‌بندی زیرمجموعه‌ها";
    case "rating":
      return "رتبه‌بندی بر اساس امتیاز";
    case "province":
      return "رتبه‌بندی استان‌ها";
    default:
      return "رتبه‌بندی کاربران";
  }
}

function getViewComparisonTitle(view: LeaderboardView): string {
  switch (view) {
    case "ministry":
      return "مقایسه عملکرد وزارتخانه‌ها";
    case "organization":
      return "مقایسه عملکرد زیرمجموعه‌ها";
    case "rating":
      return "مقایسه امتیاز محتوایی کاربران";
    case "province":
      return "مقایسه عملکرد استان‌ها";
    default:
      return "مقایسه عملکرد کاربران";
  }
}

function getViewDescription(view: LeaderboardView): string {
  switch (view) {
    case "ministry":
      return "رتبه‌بندی وزارتخانه‌ها بر اساس امتیاز فعالیت و حجم محتوای ثبت‌شده";
    case "organization":
      return "رتبه‌بندی زیرمجموعه‌ها بر اساس امتیاز فعالیت و حجم محتوای ثبت‌شده";
    case "rating":
      return "رتبه‌بندی کاربران بر اساس مجموع امتیازهای ثبت‌شده روی محتوا";
    case "province":
      return "رتبه‌بندی استان‌ها بر اساس امتیاز فعالیت کاربران و حجم محتوای ثبت‌شده";
    default:
      return "رتبه‌بندی کاربران بر اساس امتیاز فعالیت و حجم محتوای ثبت‌شده";
  }
}

function getEntityLabel(view: LeaderboardView): string {
  switch (view) {
    case "ministry":
      return "وزارتخانه";
    case "organization":
      return "زیرمجموعه";
    case "province":
      return "استان";
    default:
      return "کاربر";
  }
}

function getEntityPlural(view: LeaderboardView): string {
  switch (view) {
    case "ministry":
      return "وزارتخانه‌ها";
    case "organization":
      return "زیرمجموعه‌ها";
    case "province":
      return "استان‌ها";
    default:
      return "کاربران";
  }
}

function getEntryLabel(
  view: LeaderboardView,
  entry:
    | MinistryLeaderboardEntry
    | OrganizationLeaderboardEntry
    | ProvinceLeaderboardEntry
    | UserLeaderboardEntry
): string {
  switch (view) {
    case "ministry":
      return (entry as MinistryLeaderboardEntry).ministry;
    case "organization":
      return (entry as OrganizationLeaderboardEntry).organization;
    case "province":
      return (entry as ProvinceLeaderboardEntry).province;
    default:
      return (entry as UserLeaderboardEntry).userName;
  }
}

function getEntryKey(
  view: LeaderboardView,
  entry:
    | MinistryLeaderboardEntry
    | OrganizationLeaderboardEntry
    | ProvinceLeaderboardEntry
    | UserLeaderboardEntry
): string {
  switch (view) {
    case "ministry":
      return (entry as MinistryLeaderboardEntry).ministryKey;
    case "organization":
      return (entry as OrganizationLeaderboardEntry).organizationKey;
    case "province":
      return (entry as ProvinceLeaderboardEntry).provinceKey;
    default:
      return (entry as UserLeaderboardEntry).userKey;
  }
}

export function CityLeaderboardDashboard({ data, slug }: CityLeaderboardDashboardProps) {
  const { settings } = data;
  const [view, setView] = useState<LeaderboardView>("ministry");
  const [selectedUser, setSelectedUser] = useState<UserLeaderboardEntry | null>(null);
  const [billboardScope, setBillboardScope] = useState<BillboardModalScope | null>(null);

  const ministries = useMemo(() => buildMinistryLeaderboard(data), [data]);
  const organizations = useMemo(() => buildOrganizationLeaderboard(data), [data]);
  const provinces = useMemo(() => buildProvinceLeaderboard(data), [data]);
  const users = useMemo(() => buildUserLeaderboard(data), [data]);
  const ratingUsers = useMemo(() => buildUserRatingLeaderboard(data), [data]);
  const ministryContributors = useMemo(() => buildMinistryContributorLeaderboard(data), [data]);
  const provinceContributors = useMemo(() => buildProvinceContributorLeaderboard(data), [data]);

  const activeEntries =
    view === "ministry"
      ? ministries
      : view === "organization"
        ? organizations
        : view === "province"
          ? provinces
          : view === "rating"
            ? ratingUsers
            : users;

  const isMinistryView = view === "ministry";
  const isOrganizationView = view === "organization";
  const isProvinceView = view === "province";
  const isUserLikeView = view === "user" || view === "rating";

  const selectedUserItems = useMemo(
    () => (selectedUser ? collectUserContentItems(data, selectedUser.userKey) : []),
    [data, selectedUser]
  );

  const scopedBillboards = useMemo(
    () =>
      billboardScope
        ? collectLeaderboardBillboards(data, {
            provinceKey: billboardScope.provinceKey,
            ministryKey: billboardScope.ministryKey,
            organizationKey: billboardScope.organizationKey,
            userKey: billboardScope.userKey,
          })
        : [],
    [billboardScope, data]
  );

  const chartData = useMemo(
    () =>
      activeEntries.slice(0, 10).map((entry) => ({
        label: getEntryLabel(view, entry),
        value: view === "rating" ? entry.ratingScore : entry.score,
      })),
    [activeEntries, view]
  );

  const uploadChartData = useMemo(
    () =>
      activeEntries.slice(0, 10).map((entry) => ({
        label: getEntryLabel(view, entry),
        value: entry.totalUploads,
      })),
    [activeEntries, view]
  );

  const podium = activeEntries.slice(0, 3);
  const orderedPodium = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium;
  const contributors = isMinistryView ? ministryContributors : provinceContributors;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <div>
            <Link
              href={`/campaign/${slug}`}
              className="group mb-1 flex items-center gap-1 text-xs text-muted-foreground transition-colors duration-[var(--duration-apple-fast)] ease-[var(--ease-apple-soft)] hover:text-foreground"
            >
              <ArrowRight className="h-3 w-3 transition-transform duration-[var(--duration-apple)] ease-[var(--ease-apple)] group-hover:translate-x-0.5" />
              بازگشت به گزارش اقدام
            </Link>
            <h1 className="text-lg font-bold">{getViewTitle(view)}</h1>
            <p className="text-sm text-muted-foreground">{settings.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Badge variant="outline" className="gap-1">
              <Trophy className="h-3.5 w-3.5" />
              {formatPersianNumber(activeEntries.length)} {getEntityLabel(view)}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-[1280px] space-y-8 px-4 py-8">
        <SectionHeader title={getViewComparisonTitle(view)} description={getViewDescription(view)}>
          <Badge status={settings.status}>
            {settings.status === "live" ? "زنده" : settings.status === "completed" ? "پایان‌یافته" : "پیش‌نویس"}
          </Badge>
        </SectionHeader>

        <LeaderboardViewToggle view={view} onChange={setView} />

        <p className="text-sm text-muted-foreground">
          {formatPersianDate(settings.startDate)} — {formatPersianDate(settings.endDate)}
        </p>

        {activeEntries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              هنوز داده‌ای برای مقایسه {getEntityPlural(view)} ثبت نشده است.
            </CardContent>
          </Card>
        ) : (
          <>
            {podium.length > 0 && (
              <section className="space-y-4">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <Medal className="h-5 w-5 text-primary" />
                  سکوی برترین {getEntityPlural(view)}
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {orderedPodium.map((entry) => {
                    if (isUserLikeView) {
                      return (
                        <UserPodiumCard
                          key={(entry as UserLeaderboardEntry).userKey}
                          entry={entry as UserLeaderboardEntry}
                          showRating={view === "rating"}
                        />
                      );
                    }

                    const orgEntry = entry as OrganizationLeaderboardEntry;
                    return (
                      <NamedPodiumCard
                        key={getEntryKey(view, entry)}
                        entry={entry}
                        title={getEntryLabel(view, entry)}
                        subtitle={
                          isOrganizationView && orgEntry.ministry !== orgEntry.organization
                            ? orgEntry.ministry
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <BarChartCard
                data={chartData}
                title={
                  isMinistryView
                    ? "امتیاز وزارتخانه‌ها (۱۰ وزارتخانه برتر)"
                    : isOrganizationView
                      ? "امتیاز زیرمجموعه‌ها (۱۰ زیرمجموعه برتر)"
                      : isProvinceView
                        ? "امتیاز استان‌ها (۱۰ استان برتر)"
                        : view === "rating"
                          ? "مجموع امتیاز محتوا (۱۰ نفر برتر)"
                          : "امتیاز کاربران (۱۰ نفر برتر)"
                }
                color="#2563eb"
              />
              <BarChartCard data={uploadChartData} title="تعداد محتوای ثبت‌شده" color="#16a34a" />
            </div>

            <section className="space-y-4">
              <h2 className="text-base font-semibold">جدول {getViewTitle(view)}</h2>
              <div className="space-y-3">
                {activeEntries.map((entry) => {
                  const userEntry = entry as UserLeaderboardEntry;
                  const clickable = isUserLikeView;
                  return (
                    <Card
                      key={getEntryKey(view, entry)}
                      className={clickable ? "cursor-pointer hover:border-primary/60" : undefined}
                      onClick={clickable ? () => setSelectedUser(userEntry) : undefined}
                    >
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg">{getProvinceRankBadge(entry.rank)}</span>
                            <p className="font-semibold">{getEntryLabel(view, entry)}</p>
                            {isOrganizationView && (
                              <span className="text-sm text-muted-foreground">
                                — {(entry as OrganizationLeaderboardEntry).ministry}
                              </span>
                            )}
                            {isUserLikeView && (
                              <span className="text-sm text-muted-foreground">
                                — {userEntry.ministry}
                                {userEntry.province && userEntry.province !== "نامشخص"
                                  ? ` · ${userEntry.province}`
                                  : ""}
                              </span>
                            )}
                            {entry.todayUploads > 0 && (
                              <Badge className="bg-success/15 text-success hover:bg-success/20">
                                +{formatPersianNumber(entry.todayUploads)} امروز
                              </Badge>
                            )}
                          </div>
                          <MetricsBreakdown
                            entry={entry}
                            slug={slug}
                            onOpenBillboards={() => {
                              if (isMinistryView) {
                                const ministryEntry = entry as MinistryLeaderboardEntry;
                                setBillboardScope({
                                  title: ministryEntry.ministry,
                                  ministryKey: ministryEntry.ministryKey,
                                });
                                return;
                              }
                              if (isOrganizationView) {
                                const organizationEntry = entry as OrganizationLeaderboardEntry;
                                setBillboardScope({
                                  title: organizationEntry.organization,
                                  organizationKey: organizationEntry.organizationKey,
                                });
                                return;
                              }
                              if (isProvinceView) {
                                const provinceEntry = entry as ProvinceLeaderboardEntry;
                                setBillboardScope({
                                  title: provinceEntry.province,
                                  provinceKey: provinceEntry.provinceKey,
                                });
                                return;
                              }
                              setBillboardScope({
                                title: userEntry.userName,
                                userKey: userEntry.userKey,
                              });
                            }}
                          />
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {view === "rating" ? (
                            <Badge variant="secondary">
                              {formatPersianNumber(entry.ratingScore)} امتیاز محتوا
                            </Badge>
                          ) : (
                            <Badge variant="secondary">{formatPersianNumber(entry.score)} امتیاز</Badge>
                          )}
                          <Badge variant="outline">{formatPersianNumber(entry.totalUploads)} محتوا</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            {(isMinistryView || isProvinceView) && (
              <section className="space-y-4">
                <h2 className="text-base font-semibold">
                  {isMinistryView
                    ? "برترین کاربران در هر وزارتخانه"
                    : "برترین کاربران در هر استان"}
                </h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {contributors.slice(0, 12).map((contributor) => {
                    const groupLabel = isMinistryView
                      ? (contributor as { ministry: string }).ministry
                      : (contributor as { province: string }).province;
                    const groupKey = isMinistryView
                      ? (contributor as { ministryKey: string }).ministryKey
                      : (contributor as { provinceKey: string }).provinceKey;

                    return (
                      <Card key={`${groupKey}-${contributor.userName}-${contributor.rank}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between gap-2 text-sm">
                            <span>{contributor.userName}</span>
                            <span>{getProvinceRankBadge(contributor.rank)}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                          <p>{groupLabel}</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">
                              {formatPersianNumber(contributor.score)} امتیاز
                            </Badge>
                            <Badge variant="secondary">
                              {formatPersianNumber(contributor.totalUploads)} محتوا
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <UserContentScoreModal
        open={Boolean(selectedUser)}
        onOpenChange={(open) => {
          if (!open) setSelectedUser(null);
        }}
        userName={selectedUser?.userName ?? ""}
        items={selectedUserItems}
      />

      <LeaderboardBillboardsModal
        open={Boolean(billboardScope)}
        onOpenChange={(open) => {
          if (!open) setBillboardScope(null);
        }}
        title={billboardScope?.title ?? ""}
        billboards={scopedBillboards}
      />

      <ScrollToTopButton />
    </div>
  );
}
