import { APP_BUILD_ID } from "@/lib/app-build-id";

export const dynamic = "force-dynamic";

/** Lightweight build id for stale-bundle detection on the client. */
export async function GET() {
  return Response.json(
    { buildId: APP_BUILD_ID },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
