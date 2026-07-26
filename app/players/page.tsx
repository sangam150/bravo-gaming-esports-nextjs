import { PlatformPlayersPage } from "@/components/platform/PlatformPages";
import { getPlatformHubData } from "@/lib/platform-hub";
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
  const [hub, pubg, resolvedSearchParams] = await Promise.all([getPlatformHubData(), getPubgHubDataset(), searchParams]);
  return <PlatformPlayersPage hub={hub} pubg={pubg} searchParams={resolvedSearchParams} />;
}
