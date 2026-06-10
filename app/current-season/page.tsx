import CurrentSeasonPageClient from "@/components/current-season/CurrentSeasonPageClient";
import { getCurrentSeasonOverview } from "@/lib/data";

export default async function CurrentSeasonPage() {
  const overview = await getCurrentSeasonOverview();
  return <CurrentSeasonPageClient initialOverview={overview} />;
}
