import { NextResponse } from "next/server";
import { pgUnlockCampaignMeetings } from "@/lib/db/repository-extended";
import { withFileAccessTokensDeep } from "@/lib/uploads";
import { isPostgresConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: "Database required" }, { status: 503 });
  }

  const { slug } = await params;
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password ?? "";

  const result = await pgUnlockCampaignMeetings(slug, password);

  if (result.status === "not_found") {
    return NextResponse.json({ error: "کمپین یافت نشد" }, { status: 404 });
  }

  if (result.status === "wrong_password") {
    return NextResponse.json({ error: "رمز اشتباه است" }, { status: 401 });
  }

  return NextResponse.json({ meetings: withFileAccessTokensDeep(result.meetings) });
}
