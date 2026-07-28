import { getScrimDayResults, getScrims } from "@/lib/data";
import { selectPublicScrimDays, selectPublicScrims, toPublicScrim } from "@/lib/public-scrims";

export async function GET() {
  const [scrims, scrimDays] = await Promise.all([getScrims(), getScrimDayResults()]);
  const data = selectPublicScrims(scrims).map(toPublicScrim);
  const days = selectPublicScrimDays(scrimDays);

  return Response.json({
    success: true,
    data,
    days,
    message: data.length === 0 ? "Match data will appear once results are published." : undefined,
  });
}
