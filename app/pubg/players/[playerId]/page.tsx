import JsonLd from "@/components/JsonLd";
import { PubgPlayerProfileShowcasePage } from "@/components/pubg/PubgShowcasePages";
import { buildContentMetadata } from "@/lib/metadata";
import { findPublicPubgPlayer, getPubgHubDataset, getPubgPlayerById } from "@/lib/pubg-hub";
import { buildBreadcrumbStructuredData } from "@/lib/structured-data";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

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
    const player = findPublicPubgPlayer(dataset, playerId);
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

  return buildContentMetadata({
    title: `${player.pubgName} Player Profile | Bravo Gaming Esports`,
    description: `Track ${player.pubgName} on Bravo with event stats, kills, assists, knocks, damage, best match context, and recent form.`,
    path: `/pubg/players/${player.slug}`,
    imageUrl: player.avatarUrl,
    type: "website",
  });
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

  return (
    <>
      <JsonLd
        data={buildBreadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: "PUBG", path: "/pubg" },
          { name: "Players", path: "/pubg/players" },
          { name: player.pubgName, path: `/pubg/players/${player.slug}` },
        ])}
      />
      <PubgPlayerProfileShowcasePage player={player} dataset={dataset} searchParams={resolvedSearchParams} />
    </>
  );
}
