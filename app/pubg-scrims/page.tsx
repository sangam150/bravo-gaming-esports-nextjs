import ScrimsPage from "@/components/pubg-scrims/ScrimsPage";
import { getScrimDayResults } from "@/lib/data";
import { toPublicScrimDayResult } from "@/lib/public-scrims";

export default async function Page() {
  const days = await getScrimDayResults();
  return <ScrimsPage days={days.map(toPublicScrimDayResult)} />;
}
