import { requireAdmin } from "@/lib/admin-auth";
import { getManagedPlatformGames, saveManagedPlatformGame } from "@/lib/platform-cms";
import { revalidateGamePaths } from "@/lib/revalidate-public";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const data = await getManagedPlatformGames({ includeUnpublished: true });
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    if (!body.name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const result = await saveManagedPlatformGame(body, body.id);
    revalidateGamePaths(result.slug);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
