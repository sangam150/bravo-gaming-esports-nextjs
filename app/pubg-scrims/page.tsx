import ScrimsPage from "@/components/pubg-scrims/ScrimsPage";
import { getScrimDayResults } from "@/lib/data";
import { buildContentMetadata } from "@/lib/metadata";
import { selectPublicScrimDays } from "@/lib/public-scrims";
import type { Metadata } from "next";

export const metadata: Metadata = buildContentMetadata({
  title: "PUBG Scrims | Bravo Gaming Esports",
  description: "Browse published Bravo Gaming Esports PUBG PC scrim days, match results, and standings.",
  path: "/pubg-scrims",
  type: "website",
});

export default async function Page() {
  const days = await getScrimDayResults();
  return <ScrimsPage days={selectPublicScrimDays(days)} />;
}
