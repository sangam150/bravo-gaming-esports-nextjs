import type { Metadata } from "next";
import { PubgPlayersPage } from "@/components/pubg/PubgPublicPages";
import { getPubgHubDataset } from "@/lib/pubg-hub";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "PUBG Players",
  description: "Track Bravo PUBG players with event stats, kills, assists, knocks, damage, match history, and recent form.",
};

export const revalidate = 300;

export default async function PubgPlayersIndexPage({ searchParams }: PageProps) {
  const [dataset, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), searchParams]);
  return <PubgPlayersPage dataset={dataset} searchParams={resolvedSearchParams} />;
}
