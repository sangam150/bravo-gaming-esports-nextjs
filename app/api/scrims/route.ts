import { getScrims } from "@/lib/data";

export async function GET() {
  const data = await getScrims();
  return Response.json({
    success: true,
    data,
    message: data.length === 0 ? "Waiting for live match data" : undefined,
  });
}
