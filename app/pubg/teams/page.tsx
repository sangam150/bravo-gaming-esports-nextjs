import { CompetitionTeamsPage } from "@/components/public/CompetitionReferencePages";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import type { Metadata } from "next";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "PUBG Teams",
  description: "Explore Bravo PUBG teams with current rosters, event stats, form, match history, and map performance.",
};

export const revalidate = 300;

export default async function PubgTeamsIndexPage({ searchParams }: PageProps) {
  const [dataset, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), searchParams]);
  return <CompetitionTeamsPage dataset={dataset} searchParams={resolvedSearchParams} basePath="/pubg/teams" />;
}
