import { writeFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/get-session";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/png", "image/webp", "image/x-icon", "image/svg+xml"]);
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session || (session.type !== "env_admin" && session.role !== "admin")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "unsupported type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const root = process.cwd();

  const targets = [
    join(root, "app", "icon.png"),
    join(root, "app", "apple-icon.png"),
    join(root, "public", "images", "dolat-icon.png"),
  ];

  await Promise.all(targets.map((p) => writeFile(p, buffer)));

  return NextResponse.json({ ok: true });
}
