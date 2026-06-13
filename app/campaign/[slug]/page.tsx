import { notFound } from "next/navigation";
import { getPublicCampaignData } from "@/lib/data-access/campaign";
import { CampaignDashboard } from "@/components/public/campaign-dashboard";

export const dynamic = "force-dynamic";

interface CampaignPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { slug } = await params;
  const data = await getPublicCampaignData(slug);

  if (!data) notFound();

  return <CampaignDashboard initialData={data} slug={slug} />;
}
