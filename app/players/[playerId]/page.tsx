import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ playerId: string }>;
};

export default async function PlayerProfilePage({ params }: PageProps) {
  const { playerId } = await params;
  redirect(`/pubg/players/${playerId}`);
}
