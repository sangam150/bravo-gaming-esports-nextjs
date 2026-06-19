import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ matchId: string }> };

export default async function MatchResultPage({ params }: PageProps) {
  const { matchId } = await params;
  redirect(`/pubg/matches/${matchId}`);
}
