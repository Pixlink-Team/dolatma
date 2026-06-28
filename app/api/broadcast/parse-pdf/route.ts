import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/auth/admin-session";
import { parseSessionTokenSync } from "@/lib/auth/session-node";
import { parseBroadcastPdfFromUrl } from "@/lib/services/broadcast-pdf-parser";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = parseSessionTokenSync(cookieStore.get(getAdminSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { pdfUrl?: string } | null;
  const pdfUrl = body?.pdfUrl?.trim();

  if (!pdfUrl) {
    return NextResponse.json({ error: "pdfUrl is required" }, { status: 400 });
  }

  try {
    const summary = await parseBroadcastPdfFromUrl(pdfUrl);
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطا در خواندن PDF";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
