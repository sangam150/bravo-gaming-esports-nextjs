import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MatchResultDetailClient from "@/components/results/MatchResultDetailClient";
import { getMatchResult } from "@/lib/pubg-sync";

type PageProps = { params: Promise<{ matchId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { matchId } = await params;
  const matchResult = await getMatchResult(matchId);

  if (!matchResult) {
    return {
      title: "Match Result Not Found",
    };
  }

  return {
    title: `Match ${matchResult.sequenceNumber ?? "-"} Results`,
    description: `View the full Bravo Gaming Esports match result for ${matchResult.pubgMatchId}.`,
  };
}

export default async function MatchResultPage({ params }: PageProps) {
  const { matchId } = await params;
  const matchResult = await getMatchResult(matchId);
  if (!matchResult) notFound();

  return <MatchResultDetailClient initialMatch={matchResult} />;
}
