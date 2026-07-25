import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getAdminSessionCookieName,
  verifyAdminSessionToken,
} from "@/lib/auth/admin-session";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";
import { isPostgresConfigured, isSupabaseConfigured } from "@/lib/utils";

/** Forward campaign query so nested layouts can enforce section permissions. */
function nextWithCampaignHeader(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const campaign = request.nextUrl.searchParams.get("campaign");
  if (campaign) {
    requestHeaders.set("x-admin-campaign", campaign);
  } else {
    requestHeaders.delete("x-admin-campaign");
  }
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

function redirectAuthenticatedAwayFromLogin(request: NextRequest) {
  const next = getSafeRedirectPath(request.nextUrl.searchParams.get("next"));
  const url = new URL(next, request.nextUrl.origin);
  return NextResponse.redirect(url);
}

function handleEnvAdminAuth(request: NextRequest) {
  return verifyAdminSessionToken(request.cookies.get(getAdminSessionCookieName())?.value).then(
    (isAuthenticated) => {
      const isAdminRoute =
        request.nextUrl.pathname.startsWith("/admin") &&
        !request.nextUrl.pathname.startsWith("/admin/login");

      if (isAdminRoute && !isAuthenticated) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        return NextResponse.redirect(url);
      }

      if (request.nextUrl.pathname === "/admin/login" && isAuthenticated) {
        return redirectAuthenticatedAwayFromLogin(request);
      }

      return nextWithCampaignHeader(request);
    }
  );
}

export async function updateSession(request: NextRequest) {
  if (isPostgresConfigured() || !isSupabaseConfigured()) {
    return handleEnvAdminAuth(request);
  }

  let supabaseResponse = nextWithCampaignHeader(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = nextWithCampaignHeader(request);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute =
    request.nextUrl.pathname.startsWith("/admin") &&
    !request.nextUrl.pathname.startsWith("/admin/login");

  if (isAdminRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (request.nextUrl.pathname === "/admin/login" && user) {
    return redirectAuthenticatedAwayFromLogin(request);
  }

  return supabaseResponse;
}
