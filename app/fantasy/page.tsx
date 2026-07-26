import { PlatformFantasyPage } from "@/components/platform/PlatformPages";
import { getPlatformHubData } from "@/lib/platform-hub";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fantasy",
  description: "Bravo Gaming Esports fantasy hub with PUBG-first foundations and future multi-game expansion.",
  robots: {
    index: false,
    follow: false,
  },
};

export const revalidate = 300;

export default async function FantasyPage() {
  const hub = await getPlatformHubData();
  return <PlatformFantasyPage hub={hub} />;
}
