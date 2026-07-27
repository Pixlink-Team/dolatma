import { NextResponse } from "next/server";
import {
  createDevicePageUnlockToken,
  getDevicePageUnlockCookieName,
  getDevicePageUnlockCookieOptions,
} from "@/lib/device-page-unlock";
import { pgVerifyDevicePagePassword } from "@/lib/db/repository-devices";
import { consumeRateLimit, getRequestClientIp } from "@/lib/security/rate-limit";
import { isPostgresConfigured } from "@/lib/utils";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: "Database required" }, { status: 503 });
  }

  const { slug } = await params;
  const rate = consumeRateLimit(`unlock:device:${getRequestClientIp(request)}:${slug}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
    lockMs: 15 * 60 * 1000,
  });
  if (!rate.ok) {
    const minutes = Math.max(1, Math.ceil(rate.retryAfterSec / 60));
    return NextResponse.json(
      {
        error: `به‌خاطر تلاش‌های ناموفق زیاد، ورود موقتاً قفل شده است. حدود ${minutes} دقیقه صبر کنید؛ در این مدت حتی رمز درست هم کار نمی‌کند.`,
        code: "rate_limited",
        retryAfterSec: rate.retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password ?? "";

  const result = await pgVerifyDevicePagePassword(slug, password);

  if (result.status === "not_found") {
    return NextResponse.json({ error: "دستگاه یافت نشد" }, { status: 404 });
  }

  if (result.status === "wrong_password") {
    return NextResponse.json({ error: "رمز اشتباه است" }, { status: 401 });
  }

  if (result.passwordHash) {
    const token = await createDevicePageUnlockToken(slug, result.passwordHash);
    const cookieStore = await cookies();
    cookieStore.set(
      getDevicePageUnlockCookieName(slug),
      token,
      getDevicePageUnlockCookieOptions()
    );
  }

  return NextResponse.json({ success: true });
}
