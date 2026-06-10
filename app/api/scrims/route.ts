import { getScrimDayResults, getScrims } from "@/lib/data";

export async function GET() {
  const [data, days] = await Promise.all([getScrims(), getScrimDayResults()]);
  return Response.json({
    success: true,
    data,
    days,
    message: data.length === 0 ? "Data not imported yet" : undefined,
  });
}
