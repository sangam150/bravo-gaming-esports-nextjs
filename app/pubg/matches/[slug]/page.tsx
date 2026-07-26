import MatchResultDetailClient from "@/components/results/MatchResultDetailClient";
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

  return {
    title: `PUBG Match ${matchResult.sequenceNumber ?? "-"}`,
    description: `View the full Bravo Gaming Esports PUBG match page for ${matchResult.pubgMatchId}, including standings, MVP, media, and screenshots.`,
  };
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
