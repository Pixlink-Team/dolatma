import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CampaignDashboard } from "@/components/public/campaign-dashboard";
import { DevicePageUnlock } from "@/components/public/device-page-unlock";
import { canScoreContent } from "@/lib/auth/access";
import { resolveCampaignAuthViewer } from "@/lib/auth/campaign-viewer";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { getPublicDeviceCampaignData } from "@/lib/data-access/campaign";
import { isDevicePageUnlocked } from "@/lib/device-page-unlock";
import {
  pgGetDeviceBySlug,
  pgGetDevicePagePasswordHash,
} from "@/lib/db/repository-devices";
import { isPostgresConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface DevicePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ campaign?: string; export?: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isPostgresConfigured()) {
    return { title: slug };
  }
  const device = await pgGetDeviceBySlug(slug);
  if (!device) return { title: "دستگاه یافت نشد" };
  return {
    title: device.shortName || device.name,
    description: `صفحه عمومی ${device.name}`,
  };
}

export default async function DevicePublicPage({ params, searchParams }: DevicePageProps) {
  const { slug } = await params;
  const { campaign: campaignParam, export: exportParam } = await searchParams;

  if (!isPostgresConfigured()) notFound();

  const meta = await pgGetDevicePagePasswordHash(slug);
  if (!meta) notFound();

  const session = await getAuthSession();
  const authViewer = await resolveCampaignAuthViewer(session);
  const canBypassPassword = Boolean(session && canScoreContent(session));
  const unlocked =
    !meta.passwordHash ||
    canBypassPassword ||
    (await isDevicePageUnlocked(slug, meta.passwordHash));

  if (meta.passwordHash && !unlocked) {
    return (
      <DevicePageUnlock slug={slug} title={meta.name} authViewer={authViewer} />
    );
  }

  const payload = await getPublicDeviceCampaignData(slug, campaignParam);
  if (!payload) notFound();

  const { device, childLinks, campaignSlug, data } = payload;
  const canScore = Boolean(session && canScoreContent(session));
  const exportMode = exportParam === "screenshot" && Boolean(session && isFullAdmin(session));
  const deviceLabel = device.shortName || device.name;
  const dataUrl = `/api/device/${encodeURIComponent(slug)}/campaign?campaign=${encodeURIComponent(campaignSlug)}`;

  const banner = (
    <div className="space-y-2">
      <div>
        <p className="text-xs text-muted-foreground">صفحه دستگاه</p>
        <p className="font-semibold">{deviceLabel}</p>
        {device.name !== deviceLabel ? (
          <p className="text-xs text-muted-foreground">{device.name}</p>
        ) : null}
      </div>
      {childLinks.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">زیرمجموعه‌ها:</span>
          {childLinks.map((child) => (
            <Link
              key={child.slug}
              href={`/device/${child.slug}${campaignParam ? `?campaign=${encodeURIComponent(campaignParam)}` : ""}`}
              className="rounded-md border bg-background px-2.5 py-1 text-xs hover:bg-muted"
            >
              {child.name}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <CampaignDashboard
      initialData={data}
      slug={campaignSlug}
      exportMode={exportMode}
      canScore={canScore}
      authViewer={authViewer}
      dataUrl={dataUrl}
      returnPath={`/device/${slug}`}
      hideCitiesLink
      banner={banner}
    />
  );
}
