import { redirect } from "next/navigation";
import { getCurrentSeasonOverview } from "@/lib/data";

export default async function PubgCurrentSeasonPage() {
  const overview = await getCurrentSeasonOverview();
  redirect(overview ? `/pubg/seasons/${overview.season.slug}` : "/pubg");
}
