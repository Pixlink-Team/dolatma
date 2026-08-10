import { handleTaghvimApi } from "@/lib/taghvim/api-handler";

type Ctx = { params: Promise<{ path?: string[] }> };

async function dispatch(request: Request, ctx: Ctx) {
  const { path = [] } = await ctx.params;
  return handleTaghvimApi(request, path);
}

export const GET = dispatch;
export const POST = dispatch;
export const PUT = dispatch;
export const DELETE = dispatch;
export const PATCH = dispatch;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
