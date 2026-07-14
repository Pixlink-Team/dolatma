import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { isPostgresConfigured } from "@/lib/utils";
import { pgGetAdminData, pgSaveBillboard } from "@/lib/db/repository";
import { isApiBillboard } from "@/lib/billboards";
import { resolveBillboardLocation } from "@/lib/billboard-location-resolver";

function buildNextTags(billboardTags: string[], province: string | null): string[] {
  const withoutProvinceTags = billboardTags.filter((tag) => !tag.startsWith("province:"));
  if (!province) return withoutProvinceTags;
  return [...withoutProvinceTags, `province:${province}`];
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: "Database required" }, { status: 503 });
  }

  let body: { campaignId?: string };
  try {
    body = (await request.json()) as { campaignId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const campaignId = body.campaignId?.trim();
  if (!campaignId) {
    return NextResponse.json({ error: "شناسه کمپین الزامی است" }, { status: 400 });
  }

  const adminData = await pgGetAdminData(campaignId);
  const billboards = adminData.billboards ?? [];

  let checked = 0;
  let updated = 0;
  let unchanged = 0;

  for (const billboard of billboards) {
    if (!isApiBillboard(billboard)) continue;
    checked++;

    const rawLocationText = String(
      billboard.description ?? billboard.location ?? billboard.title ?? ""
    ).trim();

    const existingProvince = billboard.province?.trim() || null;
    const existingCity = billboard.city?.trim() || null;
    const hasUsableCity =
      Boolean(existingCity) && existingCity !== "نامشخص";

    // Keep known manual/API locations intact; only fill blanks from address.
    if (existingProvince && hasUsableCity) {
      unchanged++;
      continue;
    }

    const resolved = resolveBillboardLocation({
      province: existingProvince,
      city: existingCity,
      address: rawLocationText,
      fullAddress: rawLocationText,
      code: billboard.code ?? null,
    });

    const nextProvince = resolved.province ?? existingProvince;
    const nextCity = hasUsableCity
      ? existingCity
      : resolved.city && resolved.city !== "نامشخص"
        ? resolved.city
        : existingCity;

    if (nextProvince === billboard.province && nextCity === billboard.city) {
      unchanged++;
      continue;
    }

    const nextTags = buildNextTags(billboard.tags ?? [], nextProvince);

    await pgSaveBillboard({
      ...billboard,
      province: nextProvince,
      city: nextCity ?? billboard.city,
      tags: nextTags,
    });

    updated++;
  }

  revalidatePath("/admin/billboards");
  revalidatePath("/");

  return NextResponse.json({
    success: true,
    checked,
    updated,
    unchanged,
  });
}

