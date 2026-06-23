import type { Metadata } from "next";
import { PubgLeaderboardsShowcasePage } from "@/components/pubg/PubgShowcasePages";
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
  return <PubgLeaderboardsShowcasePage dataset={dataset} searchParams={resolvedSearchParams} />;
}
