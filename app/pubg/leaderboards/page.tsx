import type { Metadata } from "next";
import { PubgLeaderboardsPage } from "@/components/pubg/PubgPublicPages";
import { getPubgHubDataset } from "@/lib/pubg-hub";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "PUBG Leaderboards",
  description: "Team and player leaderboards built from Bravo PUBG relational match and result tables.",
};

export const revalidate = 300;

export default async function PubgLeaderboardsIndexPage({ searchParams }: PageProps) {
  const [dataset, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), searchParams]);
  return <PubgLeaderboardsPage dataset={dataset} searchParams={resolvedSearchParams} />;
}
