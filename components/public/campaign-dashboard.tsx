"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, RefreshCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CampaignAuthChip } from "@/components/public/campaign-auth-chip";
import { CampaignOverviewSection } from "@/components/public/campaign-overview-section";
import type { CampaignAuthViewer } from "@/lib/auth/campaign-viewer";
import { BillboardSection } from "@/components/public/billboard-section";
import { PostersSection } from "@/components/public/posters-section";
import { VideosSection } from "@/components/public/videos-section";
import { CompanyWebsitesSection } from "@/components/public/company-websites-section";
import { SocialAnalyticsSection } from "@/components/public/social-analytics-section";
import { SubmissionsSection } from "@/components/public/submissions-section";
import { CampaignFilesSection } from "@/components/public/campaign-files-section";
import { RawMediaSection } from "@/components/public/raw-media-section";
import { SitePublicationsSection } from "@/components/public/site-publications-section";
import { ActivitiesSection } from "@/components/public/activities-section";
import { PressPublicationsSection } from "@/components/public/press-publications-section";
import { SocialPostsSection } from "@/components/public/social-posts-section";
import { BroadcastSection } from "@/components/public/broadcast-section";
import { MeetingsSection } from "@/components/public/meetings-section";
import { DeferredSection } from "@/components/public/deferred-section";
import { CampaignScreenshotExporter } from "@/components/public/campaign-screenshot-exporter";
import { ScrollToTopButton } from "@/components/ui/scroll-to-top-button";
import { CampaignExportProvider } from "@/lib/context/campaign-export-context";
import { CampaignScrollProvider, useCampaignScroll } from "@/lib/context/campaign-scroll-context";
import { ContentScoreProvider } from "@/lib/context/content-score-context";
import {
  collectCampaignOwnerLocations,
  OwnerLocationFilterProvider,
  useOwnerLocationFilter,
} from "@/lib/context/owner-location-filter-context";
import { isCampaignContentFilterActive } from "@/lib/campaign-content-filter";
import { collectOwnerFilterOptions } from "@/lib/owner-users";
import type { DataOwnerGroup, Ownable, PublicCampaignData } from "@/lib/types";
import { formatPersianDateTime } from "@/lib/utils";

interface CampaignDashboardProps {
  initialData: PublicCampaignData;
  slug: string;
  exportMode?: boolean;
  canScore?: boolean;
  authViewer?: CampaignAuthViewer | null;
  /** When set, refresh fetches this URL instead of /api/campaign?slug= */
  dataUrl?: string;
  /** Auth chip / return path override */
  returnPath?: string;
  /** Hide campaign-wide cities leaderboard link */
  hideCitiesLink?: boolean;
  /** Optional banner above the campaign title (e.g. device name + child links) */
  banner?: ReactNode;
  /** When true, layout fits inside the admin panel (tablet / sidebar chrome). */
  embedded?: boolean;
}

function collectAllOwnerGroups(data: PublicCampaignData): DataOwnerGroup<Ownable>[] {
  return [
    ...data.billboardGroups,
    ...data.posterGroups,
    ...data.videoGroups,
    ...data.socialPostGroups,
    ...data.sitePublicationGroups,
    ...data.newsAgencyPublicationGroups,
    ...data.activityGroups,
    ...data.broadcastReportGroups,
    ...data.meetingGroups,
    ...data.fileGroups,
    ...data.rawMediaGroups,
    ...data.submissionGroups,
  ];
}

function CampaignDashboardBody({
  data,
  slug,
  exportMode,
  lastRefresh,
  isRefreshing,
  onRefresh,
  authViewer,
  returnPath,
  hideCitiesLink,
  banner,
  embedded,
}: {
  data: PublicCampaignData;
  slug: string;
  exportMode: boolean;
  lastRefresh: Date;
  isRefreshing: boolean;
  onRefresh: () => void;
  authViewer: CampaignAuthViewer | null;
  returnPath: string;
  hideCitiesLink: boolean;
  banner?: ReactNode;
  embedded: boolean;
}) {
  const { settings, sections } = data;
  const { filter } = useOwnerLocationFilter();
  const { forceSectionsMounted } = useCampaignScroll();
  const contentFilterActive = isCampaignContentFilterActive(filter);
  const forceRender = exportMode || forceSectionsMounted;

  return (
    <div className={embedded ? "min-h-0" : "min-h-screen"} data-campaign-export-root>
      {exportMode && <CampaignScreenshotExporter slug={slug} title={settings.title} />}
      <header
        className={
          embedded
            ? "sticky top-0 z-30 rounded-xl border bg-card/95 backdrop-blur-sm"
            : "sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm"
        }
      >
        <div className="container mx-auto flex flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4 md:flex-row md:items-start md:justify-between md:gap-4">
          <div className="min-w-0 flex-1">
            {!embedded ? (
              <Link
                href="/"
                className="group mb-1 flex items-center gap-1 text-xs text-muted-foreground transition-colors duration-[var(--duration-apple-fast)] ease-[var(--ease-apple-soft)] hover:text-foreground"
                data-export-hide
              >
                <ArrowRight className="h-3 w-3 transition-transform duration-[var(--duration-apple)] ease-[var(--ease-apple)] group-hover:translate-x-0.5" />
                همه راستاها
              </Link>
            ) : null}
            <h1 className="truncate text-base font-bold sm:text-lg">{settings.title}</h1>
            {settings.tagline?.trim() ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{settings.tagline}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3" data-export-hide>
            <p className="hidden text-xs text-muted-foreground xl:block">
              آخرین بروزرسانی: {formatPersianDateTime(lastRefresh.toISOString())}
            </p>
            {!embedded ? (
              <span>
                <ThemeToggle />
              </span>
            ) : null}
            <CampaignAuthChip viewer={authViewer} returnPath={returnPath} />
            {!hideCitiesLink ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/campaign/${slug}/cities`}>
                  <Trophy className="h-4 w-4" />
                  <span className="hidden sm:inline">رتبه‌بندی وزارتخانه‌ها</span>
                  <span className="sm:hidden">رتبه‌بندی</span>
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              بروزرسانی
            </Button>
          </div>
        </div>
        {banner ? (
          <div className="border-t bg-muted/30" data-export-hide>
            <div className="container mx-auto px-3 py-2.5 sm:px-4 sm:py-3">{banner}</div>
          </div>
        ) : null}
      </header>

      <main
        className={
          embedded
            ? "mx-auto max-w-[1280px] space-y-6 overflow-x-hidden px-0 py-5 sm:space-y-8 sm:py-6"
            : "container mx-auto max-w-[1280px] space-y-8 overflow-x-hidden px-4 py-8"
        }
      >
        <CampaignOverviewSection data={data} />

        {sections.analytics && (
          <DeferredSection minHeight={240} forceRender={forceRender}>
            <section data-export-section data-export-label="سایت‌ها">
              <CompanyWebsitesSection
                websites={data.companyWebsites}
                groups={data.companyWebsiteGroups}
              />
            </section>
          </DeferredSection>
        )}

        {sections.billboards && (
          <DeferredSection minHeight={360} forceRender={forceRender}>
            <section data-export-section data-export-label="تبلیغات محیطی">
              <BillboardSection
                billboards={data.billboards}
                adminOwnerLabel={settings.adminOwnerLabel}
              />
            </section>
          </DeferredSection>
        )}

        {sections.posters && (
          <DeferredSection minHeight={400} forceRender={forceRender}>
            <section data-export-section data-export-label="پوستر و عکس">
              <PostersSection
                categories={data.posterCategories}
                posters={data.posters}
                groups={data.posterGroups}
              />
            </section>
          </DeferredSection>
        )}

        {sections.videos && (
          <DeferredSection minHeight={400} forceRender={forceRender}>
            <section data-export-section data-export-label="ویدیوها">
              <VideosSection
                categories={data.videoCategories}
                videos={data.videos}
                groups={data.videoGroups}
              />
            </section>
          </DeferredSection>
        )}

        {sections.sitePublications && (
          <DeferredSection minHeight={240} forceRender={forceRender}>
            <>
              {data.sitePublications.length > 0 && (
                <section data-export-section data-export-label="سایت">
                  <SitePublicationsSection
                    publications={data.sitePublications}
                    groups={data.sitePublicationGroups}
                    sectionId="site-publications"
                    title="سایت"
                    description="مطالب منتشرشده در سایت — عنوان هر مورد لینک مستقیم به صفحه است"
                  />
                </section>
              )}
              {data.newsAgencyPublications.length > 0 && (
                <section data-export-section data-export-label="خبرگزاری">
                  <SitePublicationsSection
                    publications={data.newsAgencyPublications}
                    groups={data.newsAgencyPublicationGroups}
                    sectionId="news-agencies"
                    title="خبرگزاری"
                    description="مطالب منتشرشده در خبرگزاری — عنوان هر مورد لینک مستقیم به صفحه است"
                  />
                </section>
              )}
            </>
          </DeferredSection>
        )}

        {sections.socialAnalytics && (
          <DeferredSection minHeight={280} forceRender={forceRender}>
            <section data-export-section data-export-label="آمار شبکه‌های اجتماعی">
              <SocialAnalyticsSection
                analytics={data.socialAnalytics}
                adminOwnerLabel={settings.adminOwnerLabel}
              />
            </section>
          </DeferredSection>
        )}

        {sections.socialPosts && (
          <DeferredSection minHeight={280} forceRender={forceRender}>
            <section data-export-section data-export-label="پست‌های شبکه اجتماعی">
              <SocialPostsSection posts={data.socialPosts} groups={data.socialPostGroups} />
            </section>
          </DeferredSection>
        )}

        {sections.pressPublications && (
          <DeferredSection minHeight={320} forceRender={forceRender}>
            <section data-export-section data-export-label="مجله و روزنامه">
              <PressPublicationsSection
                publications={data.pressPublications}
                groups={data.pressPublicationGroups}
              />
            </section>
          </DeferredSection>
        )}

        {sections.activities && (
          <DeferredSection minHeight={320} forceRender={forceRender}>
            <section data-export-section data-export-label="اقدامات">
              <ActivitiesSection
                activities={data.activities}
                groups={data.activityGroups}
                sectionId="activities"
              />
            </section>
          </DeferredSection>
        )}

        {sections.broadcastReports && (
          <DeferredSection minHeight={240} forceRender={forceRender}>
            <section data-export-section data-export-label="پخش صدا و سیما">
              <BroadcastSection reports={data.broadcastReports} groups={data.broadcastReportGroups} />
            </section>
          </DeferredSection>
        )}

        {sections.meetings && (
          <DeferredSection minHeight={280} forceRender={forceRender}>
            <section data-export-section data-export-label="جلسات و مصوبات">
              <MeetingsSection
                meetings={data.meetings}
                groups={data.meetingGroups}
                campaignSlug={slug}
                meetingsHasPassword={data.meetingsHasPassword}
              />
            </section>
          </DeferredSection>
        )}

        {sections.files && (
          <DeferredSection minHeight={200} forceRender={forceRender}>
            <section data-export-section data-export-label="فایل‌ها">
              <CampaignFilesSection files={data.files} groups={data.fileGroups} />
            </section>
          </DeferredSection>
        )}

        {sections.rawMedia && (
          <DeferredSection minHeight={240} forceRender={forceRender}>
            <section data-export-section data-export-label="راش تصاویر">
              <RawMediaSection
                items={data.rawMedia}
                groups={data.rawMediaGroups}
                storage={data.rawMediaStorage}
                campaignId={data.settings.id}
              />
            </section>
          </DeferredSection>
        )}

        {sections.submissions && !contentFilterActive && (
          <DeferredSection minHeight={280} forceRender={forceRender}>
            <section data-export-section data-export-label="مشارکت‌ها">
              <SubmissionsSection
                submissions={data.submissions}
                groups={data.submissionGroups}
                summary={data.submissionSummary}
              />
            </section>
          </DeferredSection>
        )}
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>گزارش زنده راستا — {settings.title}</p>
      </footer>

      {!exportMode && !embedded && <ScrollToTopButton />}
    </div>
  );
}

export function CampaignDashboard({
  initialData,
  slug,
  exportMode = false,
  canScore = false,
  authViewer = null,
  dataUrl,
  returnPath,
  hideCitiesLink = false,
  banner,
  embedded = false,
}: CampaignDashboardProps) {
  const [data, setData] = useState(initialData);
  const [lastRefresh, setLastRefresh] = useState(() => new Date(initialData.lastUpdated));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const resolvedReturnPath = returnPath ?? `/campaign/${slug}`;

  const refreshData = useCallback(async () => {
    if (exportMode) return;
    setIsRefreshing(true);
    try {
      const url = dataUrl ?? `/api/campaign?slug=${encodeURIComponent(slug)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const payload = (await res.json()) as
          | PublicCampaignData
          | { data: PublicCampaignData };
        const newData =
          "data" in payload && payload.data ? payload.data : (payload as PublicCampaignData);
        setData(newData);
        setLastRefresh(new Date());
      }
    } catch {
      // Keep existing data
    } finally {
      setIsRefreshing(false);
    }
  }, [slug, exportMode, dataUrl]);

  useEffect(() => {
    if (exportMode) return;
    const interval = setInterval(refreshData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshData, exportMode]);

  const ownerUsers = useMemo(() => collectOwnerFilterOptions(data), [data]);
  const ownerLocations = useMemo(
    () => collectCampaignOwnerLocations(collectAllOwnerGroups(data)),
    [data]
  );

  return (
    <CampaignExportProvider exportMode={exportMode}>
      <CampaignScrollProvider>
        <ContentScoreProvider canScore={canScore} campaignId={data.settings.id}>
          <OwnerLocationFilterProvider
            users={ownerUsers}
            locations={ownerLocations}
            plans={data.settings.contentPlans ?? []}
          >
            <CampaignDashboardBody
              data={data}
              slug={slug}
              exportMode={exportMode}
              lastRefresh={lastRefresh}
              isRefreshing={isRefreshing}
              onRefresh={refreshData}
              authViewer={authViewer}
              returnPath={resolvedReturnPath}
              hideCitiesLink={hideCitiesLink}
              banner={banner}
              embedded={embedded}
            />
          </OwnerLocationFilterProvider>
        </ContentScoreProvider>
      </CampaignScrollProvider>
    </CampaignExportProvider>
  );
}
