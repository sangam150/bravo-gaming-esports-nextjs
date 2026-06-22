import { requireAdmin } from "@/lib/admin-auth";
import {
  deleteSeason,
  getSeason,
  getSeasonOverviewBySlug,
  saveSeason,
} from "@/lib/data";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const overview = await getSeasonOverviewBySlug(id);
  const season = overview?.season ?? await getSeason(id);

  if (!season) {
    return Response.json({ error: "Season not found" }, { status: 404 });
  }

  return Response.json({
    success: true,
    data: {
      season,
      tournaments: overview?.tournaments ?? [],
      leaderboard: overview?.leaderboard ?? [],
      teams: overview?.teams ?? [],
      players: overview?.players ?? [],
    },
  });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const body = await request.json();
    if (!body.title) {
      return Response.json({ error: "title is required" }, { status: 400 });
    }

    const result = await saveSeason(body, id);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const result = await deleteSeason(id);
  return Response.json({ success: true, data: result });
}
