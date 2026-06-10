import ResultsPageClient from "@/components/results/ResultsPageClient";
import { getCurrentSeasonOverview, getScrimDayResults } from "@/lib/data";

export default async function ResultsPage() {
  const [overview, dayResults] = await Promise.all([getCurrentSeasonOverview(), getScrimDayResults()]);
  return <ResultsPageClient initialOverview={overview} initialDayResults={dayResults} />;
}
