import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/auth/admin-session";
import { getOwnerFilter } from "@/lib/auth/get-session";
import { parseSessionTokenSync } from "@/lib/auth/session-node";
import * as pg from "@/lib/db/repository";
import { createRawMediaExportZip } from "@/lib/services/raw-media-export";
import { isPostgresConfigured } from "@/lib/utils";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const session = parseSessionTokenSync(cookieStore.get(getAdminSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  if (isPostgresConfigured()) {
    const campaign = await pg.pgGetCampaignById(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
  }

  try {
    const ownerFilter = await getOwnerFilter(session);
    const { buffer, campaignSlug } = await createRawMediaExportZip(campaignId, ownerFilter);
    const date = new Date().toISOString().split("T")[0];
    const filename = `raw-media-${campaignSlug}-${date}.zip`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    const status = message.includes("not found") || message.includes("No raw media") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
