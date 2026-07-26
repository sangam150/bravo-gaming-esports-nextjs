import { PlatformRankingsPage } from "@/components/platform/PlatformPages";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import type { Metadata } from "next";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Rankings",
  description: "Multi-game Bravo rankings system for teams, players, games, and Nepal-wide ecosystem visibility.",
};

export const revalidate = 300;

export default async function RankingsPage({ searchParams }: PageProps) {
  const [hub, pubg, resolvedSearchParams] = await Promise.all([getPlatformHubData(), getPubgHubDataset(), searchParams]);
  return <PlatformRankingsPage hub={hub} pubg={pubg} searchParams={resolvedSearchParams} />;
}
