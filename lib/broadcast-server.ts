import "server-only";
import { unstable_cache } from "next/cache";
import { DEFAULT_BROADCAST_STATE, buildBroadcastSnapshot, type BroadcastState } from "./broadcast";
import { COLLECTIONS, getDocument, saveDocumentIfFieldsMatch } from "./document-store";
import { getPublicTournament, getTournamentMatches, getTournamentPlayers, getTournamentTeams, getSponsors, getTeams } from "./data";
import type { Scrim } from "./types";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import { transitionBroadcastStudio, type StudioAction, type StudioRecord } from "./broadcast-studio";
import { getTournament } from "./data";
import { getEventProduction } from "./event-production-server";

const COLLECTION = "broadcastControl";
const ID = "program";

export async function getBroadcastState(): Promise<StudioRecord> {
  return { ...DEFAULT_BROADCAST_STATE, ...(await getDocument<StudioRecord>(COLLECTION, ID)) };
}

export async function saveBroadcastState(next: BroadcastState, action: StudioAction) {
  // Insert-only initialization prevents a second operator from resetting state.
  const { error } = await getSupabaseServiceRoleClient()
    .from("app_documents")
    .upsert(
      {
        collection_name: COLLECTION,
        id: ID,
        data: { ...DEFAULT_BROADCAST_STATE },
      },
      { onConflict: "collection_name,id", ignoreDuplicates: true },
    );
  if (error) throw error;
  const current = await getBroadcastState();
  return saveDocumentIfFieldsMatch<StudioRecord>(
    COLLECTION,
    ID,
    { ...transitionBroadcastStudio(current, next, action) },
    { revision: next.revision },
  );
}

export async function buildStudioPreviewSnapshot() {
  const record = await getBroadcastState();
  const state = record.draft ?? record;
  const tournament = state.tournamentId ? await getTournament(state.tournamentId, { includeInternal: true }) : null;
  const [matches, teams, players, sponsors] = tournament ? await Promise.all([
    getTournamentMatches(tournament.id, { includeDrafts: true }), getTournamentTeams(tournament.id, { includeInternal: true }),
    getTournamentPlayers(tournament.id), getSponsors(),
  ]) : [[], [], [], []];
  const production = tournament ? await getEventProduction(tournament.id) : null;
  const scrim = state.scrimId ? await getDocument<Scrim>(COLLECTIONS.scrims, state.scrimId) : null;
  const slotTeams = scrim && tournament && scrim.tournamentId === tournament.id ? (await getTeams()).filter(team => scrim.teamIds.includes(team.id)) : [];
  return buildBroadcastSnapshot({ state, tournament, matches, teams: [...teams, ...slotTeams.filter(team => !teams.some(existing => existing.id === team.id))], players, sponsors, scrim, privatePreview: true, production: production?.draft });
}

// Short shared cache bounds expensive hydration across multiple OBS sources.
// Public visibility is re-evaluated on every cache refresh; no draft reads occur.
export const getBroadcastSnapshot = unstable_cache(
  async () => {
    const state = await getBroadcastState();
    const tournament = state.tournamentId ? await getPublicTournament(state.tournamentId) : null;
    const [matches, teams, players, sponsors] = tournament
      ? await Promise.all([
          getTournamentMatches(tournament.id, { preserveResultIdentity: true }),
          getTournamentTeams(tournament.id),
          getTournamentPlayers(tournament.id),
          getSponsors(),
        ])
      : [[], [], [], []];
    const production = tournament ? (await getEventProduction(tournament.id)).approved : null;
    const scrim = state.scrimId ? await getDocument<Scrim>(COLLECTIONS.scrims, state.scrimId) : null;
    const slotTeams = scrim && tournament && scrim.tournamentId === tournament.id && scrim.published === true && !scrim.deletedAt ? (await getTeams()).filter(team => scrim.teamIds.includes(team.id)) : [];
    return { snapshot: buildBroadcastSnapshot({ state, tournament, matches, teams: [...teams, ...slotTeams.filter(team => !teams.some(existing => existing.id === team.id))], players, sponsors, scrim, production }), generatedAt: Date.now() };
  },
  ["broadcast-snapshot-v1"],
  { revalidate: 2, tags: ["broadcast"] },
);
