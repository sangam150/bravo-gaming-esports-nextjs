import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PubgPlayerDetailPage } from "@/components/pubg/PubgPublicPages";
import { getPubgHubDataset, getPubgPlayerById } from "@/lib/pubg-hub";

type PageProps = {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function resolvePlayer(playerId: string) {
  try {
    return await getPubgPlayerById(playerId);
  } catch {
    return null;
  }
}

async function resolvePlayerDataset(playerId: string) {
  try {
    const dataset = await getPubgHubDataset();
    const normalizedPlayerId = playerId.trim().toLowerCase();
    const player =
      dataset.players.find((item) => item.id === playerId || item.slug.toLowerCase() === normalizedPlayerId) ?? null;
    return { dataset, player };
  } catch {
    return { dataset: null, player: null };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { playerId } = await params;
  const player = await resolvePlayer(playerId);

  if (!player) {
    return { title: "PUBG Player Not Found" };
  }

  return {
    title: `${player.pubgName} Player Profile`,
    description: `Track ${player.pubgName} on Bravo with event stats, kills, assists, knocks, damage, best match context, and recent form.`,
  };
}

export const revalidate = 300;

export default async function PubgPlayerDetailRoute({ params, searchParams }: PageProps) {
  const [{ playerId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const { dataset, player } = await resolvePlayerDataset(playerId);

  if (!dataset || !player) {
    notFound();
  }

  if (playerId !== player.slug) {
    redirect(`/pubg/players/${player.slug}`);
  }

  return <PubgPlayerDetailPage player={player} dataset={dataset} searchParams={resolvedSearchParams} />;
}
