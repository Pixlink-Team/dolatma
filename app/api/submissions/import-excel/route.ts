import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/auth/admin-session";
import { parseSessionTokenSync } from "@/lib/auth/session-node";
import { isFullAdmin } from "@/lib/auth/get-session";
import { assertContributorTutorialCompleted } from "@/lib/auth/require-tutorial-completion";
import { resolveDefaultAdminOwnerUserId } from "@/lib/admin-content-owner";
import { hasContributorPermission } from "@/lib/contributor-permissions";
import { pgGetUserPermissionsForCampaign } from "@/lib/db/repository-extended";
import { importSubmissionsFromExcel } from "@/lib/data-access/admin";
import { parseSubmissionsExcel } from "@/lib/services/submissions-excel-parser";

const MAX_EXCEL_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = parseSessionTokenSync(cookieStore.get(getAdminSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const campaignId = String(formData.get("campaignId") ?? "").trim();

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "فایلی ارسال نشده است" }, { status: 400 });
  }

  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
    return NextResponse.json({ error: "فقط فایل Excel (.xlsx / .xls) مجاز است" }, { status: 400 });
  }

  if (file.size > MAX_EXCEL_BYTES) {
    return NextResponse.json({ error: "حجم فایل بیش از حد مجاز است" }, { status: 400 });
  }

  if (!isFullAdmin(session) && session.userId) {
    const permissions = await pgGetUserPermissionsForCampaign(session.userId, campaignId);
    if (!hasContributorPermission(permissions, "submissions")) {
      return NextResponse.json({ error: "دسترسی ندارید" }, { status: 403 });
    }
  }

  const tutorialDenied = await assertContributorTutorialCompleted("submissions");
  if (tutorialDenied) {
    return NextResponse.json({ error: tutorialDenied.error }, { status: 403 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseSubmissionsExcel(buffer);

    if (rows.length === 0) {
      return NextResponse.json({ error: "هیچ ردیف معتبری در فایل Excel پیدا نشد" }, { status: 400 });
    }

    const ownerUserId = isFullAdmin(session)
      ? await resolveDefaultAdminOwnerUserId()
      : session.userId ?? null;
    const result = await importSubmissionsFromExcel(campaignId, rows, ownerUserId);

    revalidatePath("/admin/submissions");
    revalidatePath("/admin");
    revalidatePath("/campaign/[slug]", "page");

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطا در خواندن فایل Excel";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
