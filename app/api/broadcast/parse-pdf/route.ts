import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/get-session";
import { parseBroadcastPdfFromUrl } from "@/lib/services/broadcast-pdf-parser";

export async function POST(request: Request) {
  const session = await getAuthSession();
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
