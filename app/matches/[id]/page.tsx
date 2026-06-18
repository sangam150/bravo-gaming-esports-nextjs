import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformMatchDetailPage } from "@/components/platform/PlatformPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformHubData, getPlatformMatchById } from "@/lib/platform-hub";
import { getPubgHubDataset } from "@/lib/pubg-hub";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const match = await getPlatformMatchById(id);

  if (!match) {
    return { title: "Match Not Found" };
  }

  return buildContentMetadata({
    title: `${match.teamA} vs ${match.teamB}`,
    description: match.summary,
    path: `/matches/${match.id}`,
  });
}

export const revalidate = 300;

export default async function MatchDetailPage({ params }: PageProps) {
  const [{ id }, hub, pubg] = await Promise.all([params, getPlatformHubData(), getPubgHubDataset()]);
  const match = hub.matches.find((item) => item.id === id) ?? null;

  if (!match) {
    notFound();
  }

  return <PlatformMatchDetailPage hub={hub} match={match} pubg={match.gameSlug === "pubg-pc" ? pubg : null} />;
}
