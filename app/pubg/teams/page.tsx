import type { Metadata } from "next";
import { PubgTeamsPage } from "@/components/pubg/PubgPublicPages";
import { getPubgHubDataset } from "@/lib/pubg-hub";

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
  return <PubgTeamsPage dataset={dataset} searchParams={resolvedSearchParams} />;
}
