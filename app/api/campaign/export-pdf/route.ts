import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/auth/admin-session";
import { parseSessionTokenSync } from "@/lib/auth/session-node";
import { getPublicCampaignData } from "@/lib/data-access/campaign";
import { generateCampaignPdf } from "@/lib/services/campaign-pdf";
import * as pg from "@/lib/db/repository";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const session = parseSessionTokenSync(cookieStore.get(getAdminSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const campaignId = searchParams.get("campaignId");

  let resolvedSlug = slug;
  if (!resolvedSlug && campaignId) {
    const campaign = await pg.pgGetCampaignById(campaignId);
    resolvedSlug = campaign?.slug ?? null;
  }

  if (!resolvedSlug) {
    return NextResponse.json({ error: "slug or campaignId is required" }, { status: 400 });
  }

  const data = await getPublicCampaignData(resolvedSlug);
  if (!data) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const pdfBuffer = generateCampaignPdf(data);
  const filename = `campaign-${resolvedSlug}-${new Date().toISOString().split("T")[0]}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
