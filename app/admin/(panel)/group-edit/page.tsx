import { redirect } from "next/navigation";
import { GroupEditAdmin } from "@/components/admin/group-edit-admin";
import { resolveAdminCampaignId } from "@/lib/admin-campaign";
import { getAdminData, getAllUsers } from "@/lib/data-access/admin";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import type {
  Billboard,
  CampaignActivity,
  CampaignFile,
  Poster,
  RawMediaUpload,
  SocialMediaPost,
  Video,
} from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function GroupEditPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { campaignId } = await resolveAdminCampaignId(params.campaign);
  if (!campaignId) redirect("/admin");

  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!isFullAdmin(session)) redirect("/admin");

  const [data, users] = await Promise.all([
    getAdminData(campaignId, [
      "campaigns",
      "billboards",
      "posterCategories",
      "posters",
      "videoCategories",
      "videos",
      "files",
      "rawMedia",
      "socialPosts",
      "activities",
    ]),
    getAllUsers(),
  ]);
  if (!data.settings) redirect("/admin");

  return (
    <GroupEditAdmin
      campaignId={campaignId}
      isFullAdmin
      permissions={null}
      users={users}
      contentPlans={data.settings.contentPlans ?? []}
      contentTopics={data.settings.contentTopics ?? []}
      billboards={(data.billboards ?? []) as Billboard[]}
      posters={(data.posters ?? []) as Poster[]}
      posterCategories={data.posterCategories ?? []}
      videos={(data.videos ?? []) as Video[]}
      videoCategories={data.videoCategories ?? []}
      files={(data.files ?? []) as CampaignFile[]}
      rawMedia={(data.rawMedia ?? []) as RawMediaUpload[]}
      socialPosts={(data.socialPosts ?? []) as SocialMediaPost[]}
      activities={(data.activities ?? []) as CampaignActivity[]}
    />
  );
}
