import { NextResponse } from "next/server";
import { canScoreContent } from "@/lib/auth/access";
import { getAuthSession } from "@/lib/auth/get-session";
import { getPublicDeviceCampaignData } from "@/lib/data-access/campaign";
import {
  isDevicePageUnlocked,
} from "@/lib/device-page-unlock";
import { pgGetDevicePagePasswordHash } from "@/lib/db/repository-devices";
import { isPostgresConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: "Database required" }, { status: 503 });
  }

  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const campaignSlug = searchParams.get("campaign");

  const meta = await pgGetDevicePagePasswordHash(slug);
  if (!meta) {
    return NextResponse.json({ error: "دستگاه یافت نشد" }, { status: 404 });
  }

  const session = await getAuthSession();
  const canBypassPassword = Boolean(session && canScoreContent(session));
  const unlocked =
    !meta.passwordHash ||
    canBypassPassword ||
    (await isDevicePageUnlocked(slug, meta.passwordHash));

  if (!unlocked) {
    return NextResponse.json({ error: "رمز الزامی است" }, { status: 401 });
  }

  const payload = await getPublicDeviceCampaignData(slug, campaignSlug);
  if (!payload) {
    return NextResponse.json({ error: "داده‌ای یافت نشد" }, { status: 404 });
  }

  return NextResponse.json(payload);
}
