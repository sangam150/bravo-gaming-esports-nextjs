import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PlayerProfileClient from "@/components/players/PlayerProfileClient";
import { getPlayer, getPlayerMatchPlayers, getTeam } from "@/lib/data";

type PageProps = { params: Promise<{ playerId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { playerId } = await params;
  const player = await getPlayer(playerId);

  if (!player) {
    return {
      title: "Player Not Found",
    };
  }

  return {
    title: `${player.name} Player Profile`,
    description: `Track ${player.name}'s kills, damage, MVP awards, and Bravo Gaming Esports player form.`,
  };
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { playerId } = await params;
  const player = await getPlayer(playerId);
  if (!player) notFound();

  const [team, matchPlayers] = await Promise.all([
    player.teamId ? getTeam(player.teamId) : Promise.resolve(null),
    getPlayerMatchPlayers(player.pubgId ?? player.name),
  ]);

  return <PlayerProfileClient initialPlayer={player} initialTeam={team} initialMatchPlayers={matchPlayers} />;
}
