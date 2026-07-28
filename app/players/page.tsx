import { CompetitionPlayersPage } from "@/components/public/competition/CompetitionPlayersPage";
import { buildContentMetadata } from "@/lib/metadata";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import type { Metadata } from "next";

export const metadata: Metadata = buildContentMetadata({
  title: "Players | Bravo Gaming Esports",
  description: "Explore published Bravo Gaming Esports player profiles, team links, and PUBG PC competition statistics.",
  path: "/players",
  type: "website",
});

export const revalidate = 300;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const [dataset, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), searchParams]);
  return <CompetitionPlayersPage dataset={dataset} searchParams={resolvedSearchParams} basePath="/players" />;
}
