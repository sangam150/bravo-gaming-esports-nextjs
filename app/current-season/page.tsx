import { getCurrentSeasonOverview } from "@/lib/data";
import { redirect } from "next/navigation";

export default async function CurrentSeasonPage() {
  const overview = await getCurrentSeasonOverview();
  redirect(overview ? `/pubg/seasons/${overview.season.slug}` : "/pubg");
}
