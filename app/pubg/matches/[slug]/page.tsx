import MatchResultDetailClient from "@/components/results/MatchResultDetailClient";
import { buildContentMetadata } from "@/lib/metadata";
import { getMatchResult } from "@/lib/pubg-sync";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function resolveMatchResult(slug: string) {
  try {
    return await getMatchResult(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const matchResult = await resolveMatchResult(slug);

  if (!matchResult) {
    notFound();
  }

  const matchLabel =
    typeof matchResult.sequenceNumber === "number" ? `Match ${matchResult.sequenceNumber}` : `Match ${matchResult.pubgMatchId}`;

  return buildContentMetadata({
    title: `${matchLabel} | Bravo Gaming Esports`,
    description: `View published PUBG standings, player statistics, and available media for ${matchLabel}.`,
    path: `/pubg/matches/${slug}`,
    type: "website",
  });
}

export const revalidate = 300;

export default async function PubgMatchDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const matchResult = await resolveMatchResult(slug);

  if (!matchResult) {
    notFound();
  }

  return <MatchResultDetailClient initialMatch={matchResult} />;
}
