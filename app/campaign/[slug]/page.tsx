import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicCampaignData } from "@/lib/data-access/campaign";
import { CampaignDashboard } from "@/components/public/campaign-dashboard";
import { CampaignPageUnlock } from "@/components/public/campaign-page-unlock";
import { canScoreContent } from "@/lib/auth/access";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { isCampaignPageUnlocked } from "@/lib/campaign-page-unlock";
import { buildCampaignMetadata } from "@/lib/campaign-metadata";
import { pgGetPublishedCampaignBySlug } from "@/lib/db/repository";
import { isPostgresConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface CampaignPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ export?: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  if (isPostgresConfigured()) {
    const settings = await pgGetPublishedCampaignBySlug(slug);
    if (settings) {
      return buildCampaignMetadata(settings);
    }
  }

  return buildCampaignMetadata({
    title: slug,
    tagline: null,
    description: "",
    coverImageUrl: null,
    faviconUrl: null,
    slug,
  });
}

export default async function CampaignPage({ params, searchParams }: CampaignPageProps) {
  const { slug } = await params;
  const { export: exportParam } = await searchParams;

  let pagePasswordHash: string | null = null;
  let lockedTitle = slug;

  if (isPostgresConfigured()) {
    const settings = await pgGetPublishedCampaignBySlug(slug);
    if (!settings) notFound();
    pagePasswordHash = settings.pageViewPasswordHash ?? null;
    lockedTitle = settings.title;
  }

  const session = await getAuthSession();
  const canBypassPassword = Boolean(session && canScoreContent(session));
  const unlocked =
    !pagePasswordHash ||
    canBypassPassword ||
    (await isCampaignPageUnlocked(slug, pagePasswordHash));

  if (pagePasswordHash && !unlocked) {
    return <CampaignPageUnlock slug={slug} title={lockedTitle} />;
  }

  const data = await getPublicCampaignData(slug);
  if (!data) notFound();

  const canScore = Boolean(session && canScoreContent(session));
  // Screenshot PDF export is admin-only (avoids heavy full-page capture for others)
  const exportMode = exportParam === "screenshot" && Boolean(session && isFullAdmin(session));

  return (
    <CampaignDashboard
      initialData={data}
      slug={slug}
      exportMode={exportMode}
      canScore={canScore}
    />
  );
}
