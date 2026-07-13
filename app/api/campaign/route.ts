import { NextResponse } from "next/server";
import { getPublicCampaignData } from "@/lib/data-access/campaign";
import { canScoreContent } from "@/lib/auth/access";
import { getAuthSession } from "@/lib/auth/get-session";
import { isCampaignPageUnlocked } from "@/lib/campaign-page-unlock";
import { pgGetPublishedCampaignBySlug } from "@/lib/db/repository";
import { isPostgresConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  try {
    if (isPostgresConfigured()) {
      const settings = await pgGetPublishedCampaignBySlug(slug);
      if (!settings) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }

      const pagePasswordHash = settings.pageViewPasswordHash ?? null;
      if (pagePasswordHash) {
        const session = await getAuthSession();
        const canBypass = Boolean(session && canScoreContent(session));
        const unlocked =
          canBypass || (await isCampaignPageUnlocked(slug, pagePasswordHash));
        if (!unlocked) {
          return NextResponse.json(
            { error: "Password required", locked: true },
            { status: 401 }
          );
        }
      }
    }

    const data = await getPublicCampaignData(slug);
    if (!data) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch campaign data" }, { status: 500 });
  }
}
