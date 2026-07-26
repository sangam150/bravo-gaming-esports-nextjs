import { PubgLeaderboardsRoute } from "@/components/pubg/PubgLeaderboardsRoute";
import { PubgLeaderboardsLaunchPage } from "@/components/public/PublicLandingPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import type { Metadata } from "next";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = buildContentMetadata({
  title: "PUBG Leaderboards | Bravo Gaming Esports",
  description: "Track Bravo PUBG team and player leaderboards built from published match results and standings.",
  path: "/pubg/leaderboards",
  type: "website",
});

export const revalidate = 300;

export default async function PubgLeaderboardsIndexPage({ searchParams }: PageProps) {
  const [dataset, hub, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), getPlatformHubData(), searchParams]);

  if (dataset.matches.length === 0) {
    return <PubgLeaderboardsLaunchPage hub={hub} />;
  }

  return <PubgLeaderboardsRoute dataset={dataset} searchParams={resolvedSearchParams} />;
}
