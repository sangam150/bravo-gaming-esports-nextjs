import { getScrimDayResults, getScrims } from "@/lib/data";
import { toPublicScrim, toPublicScrimDayResult } from "@/lib/public-scrims";

export async function GET() {
  const [scrims, scrimDays] = await Promise.all([getScrims(), getScrimDayResults()]);
  const data = scrims.map(toPublicScrim);
  const days = scrimDays.map(toPublicScrimDayResult);

  return Response.json({
    success: true,
    data,
    days,
    message: data.length === 0 ? "Match data will appear once results are published." : undefined,
  });
}
