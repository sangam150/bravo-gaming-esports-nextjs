import { CompetitionPlayersPage } from "@/components/public/CompetitionReferencePages";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Players",
  description: "Explore Bravo Gaming Esports player profiles, flagship PUBG form, and platform-ready public player data.",
};

export const revalidate = 300;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const [dataset, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), searchParams]);
  return <CompetitionPlayersPage dataset={dataset} searchParams={resolvedSearchParams} basePath="/players" />;
}
