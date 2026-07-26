import { requireAdmin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  return Response.json(
    {
      error: "Seed mode is disabled. Import real Bravo match data through the admin dashboard instead.",
    },
    { status: 410 },
  );
}
