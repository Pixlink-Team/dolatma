import { NextResponse } from "next/server";
import { getPublicCampaignData } from "@/lib/data-access/campaign";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  try {
    const data = await getPublicCampaignData(slug);
    if (!data) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch campaign data" }, { status: 500 });
  }
}
