import ScrimsPage from "@/components/pubg-scrims/ScrimsPage";
import { getScrimDayResults } from "@/lib/data";

export default async function Page() {
  const days = await getScrimDayResults();
  return <ScrimsPage days={days} />;
}
