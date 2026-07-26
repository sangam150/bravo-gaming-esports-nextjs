import { PubgPlayersPage } from "@/components/pubg/PubgPublicPages";
import { PubgPlayersLaunchPage } from "@/components/public/PublicLandingPages";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset, getPublicPubgPlayers, getPublicPubgTeams } from "@/lib/pubg-hub";
import type { Metadata } from "next";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "PUBG Players",
  description: "Track Bravo PUBG players with event stats, kills, assists, knocks, damage, match history, and recent form.",
};

export const revalidate = 300;

export default async function PubgPlayersIndexPage({ searchParams }: PageProps) {
  const [dataset, hub, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), getPlatformHubData(), searchParams]);

  if (getPublicPubgPlayers(dataset, getPublicPubgTeams(dataset)).length === 0) {
    return <PubgPlayersLaunchPage hub={hub} />;
  }

  return <PubgPlayersPage dataset={dataset} searchParams={resolvedSearchParams} />;
}
