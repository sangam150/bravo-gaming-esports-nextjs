import { redirect } from "next/navigation";
import { getCurrentSeason } from "@/lib/data";

export default async function CurrentSeasonPage() {
  const season = await getCurrentSeason();
  redirect(season ? `/pubg/seasons/${season.slug}` : "/pubg");
}
