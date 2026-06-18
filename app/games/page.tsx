import type { Metadata } from "next";
import { PlatformGamesPage } from "@/components/platform/PlatformPages";
import { getPlatformHubData } from "@/lib/platform-hub";

export const metadata: Metadata = {
  title: "Games",
  description: "Browse every Bravo Gaming Esports game hub, with PUBG as the flagship and future-ready coverage for more titles.",
};

export const revalidate = 300;

export default async function GamesPage() {
  const hub = await getPlatformHubData();
  return <PlatformGamesPage hub={hub} />;
}
