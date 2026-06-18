import { requireAdmin } from "@/lib/admin-auth";
import { deleteManagedPlatformGame, saveManagedPlatformGame } from "@/lib/platform-cms";
import { revalidateGamePaths } from "@/lib/revalidate-public";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!body.name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const result = await saveManagedPlatformGame(body, id);
    revalidateGamePaths(result.slug);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const result = await deleteManagedPlatformGame(id);
  revalidateGamePaths();
  return Response.json({ success: true, data: result });
}
