import { COLLECTIONS, deleteDocument, fetchDocumentCollection, isDocumentStoreConfigured } from "./document-store";

type ResettableCollectionName =
  | keyof typeof COLLECTIONS
  | "siteStats";

export type AdminResetSummary = {
  deleted: Partial<Record<ResettableCollectionName, number>>;
  totalDeleted: number;
  message: string;
};

const COMPETITION_COLLECTIONS: Array<[ResettableCollectionName, string]> = [
  ["seasons", COLLECTIONS.seasons],
  ["tournaments", COLLECTIONS.tournaments],
  ["standings", COLLECTIONS.standings],
  ["matches", COLLECTIONS.matches],
  ["tournamentMatches", COLLECTIONS.tournamentMatches],
  ["matchResults", COLLECTIONS.matchResults],
  ["matchPlayers", COLLECTIONS.matchPlayers],
  ["teams", COLLECTIONS.teams],
  ["players", COLLECTIONS.players],
  ["scrims", COLLECTIONS.scrims],
  ["pubgMatches", COLLECTIONS.pubgMatches],
  ["pubgPlayers", COLLECTIONS.pubgPlayers],
  ["pubgImportBatches", COLLECTIONS.pubgImportBatches],
  ["pubgImportWatchers", COLLECTIONS.pubgImportWatchers],
  ["siteStats", COLLECTIONS.siteStats],
];

async function deleteEntireCollection(collectionName: string) {
  let deletedCount = 0;

  while (true) {
    const documents = await fetchDocumentCollection<Record<string, unknown>>(collectionName, 500);
    if (documents.length === 0) {
      return deletedCount;
    }

    await Promise.all(documents.map((document) => deleteDocument(collectionName, document.id)));
    deletedCount += documents.length;
  }
}

export async function resetCompetitionData(): Promise<AdminResetSummary> {
  if (!isDocumentStoreConfigured()) {
    throw new Error("Supabase is not configured. Connect the Supabase data store before running a data reset.");
  }

  const deletedEntries = await Promise.all(
    COMPETITION_COLLECTIONS.map(async ([label, collectionName]) => [
      label,
      await deleteEntireCollection(collectionName),
    ] as const)
  );

  const deleted = Object.fromEntries(deletedEntries) as Partial<Record<ResettableCollectionName, number>>;
  const totalDeleted = Object.values(deleted).reduce((sum, count) => sum + (count ?? 0), 0);

  return {
    deleted,
    totalDeleted,
    message:
      totalDeleted > 0
        ? `Reset ${totalDeleted} competitive records. Teams, players, matches, standings, scrims, tournaments, seasons, and cached PUBG imports were cleared.`
        : "No competitive records were stored, so nothing needed to be reset.",
  };
}

