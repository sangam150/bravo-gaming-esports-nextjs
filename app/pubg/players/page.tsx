import { CompetitionPlayersPage } from "@/components/public/CompetitionReferencePages";
import { getPubgHubDataset } from "@/lib/pubg-hub";
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
  const [dataset, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), searchParams]);
  return <CompetitionPlayersPage dataset={dataset} searchParams={resolvedSearchParams} basePath="/pubg/players" />;
}
