import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/auth/admin-session";
import { isFullAdmin } from "@/lib/auth/get-session";
import { parseSessionTokenSync } from "@/lib/auth/session-node";
import { importCampaignBackupZip } from "@/lib/services/campaign-backup";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = parseSessionTokenSync(cookieStore.get(getAdminSessionCookieName())?.value);
  if (!session || !isFullAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const campaignId = formData.get("campaignId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "فایل ZIP ارسال نشده است" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".zip")) {
    return NextResponse.json({ error: "فقط فایل ZIP مجاز است" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importCampaignBackupZip(
      buffer,
      typeof campaignId === "string" && campaignId ? campaignId : undefined
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Campaign import failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
