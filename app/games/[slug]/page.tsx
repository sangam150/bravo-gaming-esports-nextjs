import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformGameDetailPage } from "@/components/platform/PlatformPages";
import { getPlatformGameBySlug, getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset } from "@/lib/pubg-hub";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await getPlatformGameBySlug(slug);

  if (!game) {
    return { title: "Game Hub Not Found" };
  }

  return {
    title: `${game.name} Hub`,
    description: game.summary,
  };
}

export const revalidate = 300;

export default async function GameDetailPage({ params }: PageProps) {
  const [{ slug }, hub, pubg] = await Promise.all([params, getPlatformHubData(), getPubgHubDataset()]);
  const game = hub.games.find((item) => item.slug === slug) ?? null;

  if (!game) {
    notFound();
  }

  return <PlatformGameDetailPage hub={hub} game={game} pubg={slug === "pubg-pc" ? pubg : null} />;
}
