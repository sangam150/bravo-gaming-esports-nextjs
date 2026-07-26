import { PlatformTeamsPage } from "@/components/platform/PlatformPages";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teams",
  description: "Browse Bravo Gaming Esports team profiles, current flagship rosters, and platform-ready public team data.",
};

export const revalidate = 300;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const [hub, pubg, resolvedSearchParams] = await Promise.all([getPlatformHubData(), getPubgHubDataset(), searchParams]);
  return <PlatformTeamsPage hub={hub} pubg={pubg} searchParams={resolvedSearchParams} />;
}
